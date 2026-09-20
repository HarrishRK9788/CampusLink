-- ============================================================
-- COLLEGE HUB
-- COMPLETE SUPABASE DATABASE SCHEMA
-- ============================================================


-- ============================================================
-- 1. CLEAN UP PREVIOUS DEVELOPMENT TABLES
-- ============================================================

-- Remove auth trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Drop tables in dependency order
drop table if exists public.post_votes cascade;
drop table if exists public.comments cascade;
drop table if exists public.post_votes cascade;
drop table if exists public.comments cascade;
drop table if exists public.posts cascade;
drop table if exists public.resources cascade;
drop table if exists public.subjects cascade;
drop table if exists public.departments cascade;
drop table if exists public.profiles cascade;
drop table if exists public.colleges cascade;

-- Drop functions
drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_resource_search_vector() cascade;
drop function if exists public.update_post_score() cascade;
drop function if exists public.update_comment_count() cascade;


-- ============================================================
-- 2. COLLEGES
-- ============================================================

create table public.colleges (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  slug text unique not null,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 3. USER PROFILES
-- ============================================================

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  college_id uuid
    references public.colleges(id)
    on delete set null,

  name text,

  year int,

  department text,

  role text not null default 'user'
    check (role in ('user', 'admin')),

  created_at timestamptz not null default now()
);


-- ============================================================
-- 4. AUTOMATIC PROFILE CREATION
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  insert into public.profiles (
    id,
    name,
    college_id
  )

  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      new.raw_user_meta_data ->> 'name',
      new.email
    ),

    (
      select id
      from public.colleges
      order by created_at
      limit 1
    )
  );

  return new;

end;
$$;


create trigger on_auth_user_created

after insert on auth.users

for each row

execute function public.handle_new_user();


-- ============================================================
-- 5. DEPARTMENTS
-- ============================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),

  college_id uuid
    references public.colleges(id)
    on delete cascade,

  name text not null,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 6. SUBJECTS
-- ============================================================

create table public.subjects (
  id uuid primary key default gen_random_uuid(),

  department_id uuid
    references public.departments(id)
    on delete cascade,

  year int not null,

  semester int not null,

  name text not null,

  course_category text not null,

  regulation_tag text,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 7. RESOURCES / KNOWLEDGE BASE
-- ============================================================

create table public.resources (
  id uuid primary key default gen_random_uuid(),

  subject_id uuid
    references public.subjects(id)
    on delete cascade,

  uploaded_by uuid
    references public.profiles(id)
    on delete set null,

  title text not null,

  description text,

  file_url text not null,

  file_type text,

  unit int not null check (unit >= 1 and unit <= 5),

  tags text[],

  downloads int not null default 0,

  -- Search vector is a normal column.
  -- It is updated using a trigger below.
  search_vector tsvector,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 8. RESOURCE SEARCH
-- ============================================================

create or replace function public.update_resource_search_vector()
returns trigger
language plpgsql
as $$
begin

  new.search_vector :=
    to_tsvector(
      'english',

      coalesce(new.title, '') || ' ' ||

      coalesce(new.description, '') || ' ' ||

      array_to_string(
        coalesce(new.tags, '{}'),
        ' '
      )
    );

  return new;

end;
$$;


create trigger resources_search_vector_update

before insert or update of title, description, tags

on public.resources

for each row

execute function public.update_resource_search_vector();


-- Search index

create index resources_search_idx

on public.resources

using gin(search_vector);


-- ============================================================
-- 9. DISCUSSION POSTS
-- ============================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),

  college_id uuid not null
    references public.colleges(id)
    on delete cascade,

  author_id uuid not null
    references public.profiles(id)
    on delete cascade,

  title text not null,

  body text,

  tag text,

  score int not null default 0,

  comment_count int not null default 0,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 10. COMMENTS
-- ============================================================

create table public.comments (
  id uuid primary key default gen_random_uuid(),

  post_id uuid not null
    references public.posts(id)
    on delete cascade,

  author_id uuid not null
    references public.profiles(id)
    on delete cascade,

  body text not null,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 11. POST VOTES
-- ============================================================

create table public.post_votes (
  post_id uuid not null
    references public.posts(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  value smallint not null
    check (value in (-1, 1)),

  primary key (post_id, user_id)
);


-- ============================================================
-- 12. AUTOMATIC POST SCORE
-- ============================================================

create or replace function public.update_post_score()
returns trigger
language plpgsql
as $$
declare
  target_post_id uuid;
begin

  target_post_id := coalesce(new.post_id, old.post_id);

  update public.posts

  set score = (
    select coalesce(sum(value), 0)

    from public.post_votes

    where post_id = target_post_id
  )

  where id = target_post_id;

  return null;

end;
$$;


create trigger post_votes_changed

after insert or update or delete

on public.post_votes

for each row

execute function public.update_post_score();


-- ============================================================
-- 13. AUTOMATIC COMMENT COUNT
-- ============================================================

create or replace function public.update_comment_count()
returns trigger
language plpgsql
as $$
declare
  target_post_id uuid;
begin

  target_post_id := coalesce(new.post_id, old.post_id);

  update public.posts

  set comment_count = (
    select count(*)

    from public.comments

    where post_id = target_post_id
  )

  where id = target_post_id;

  return null;

end;
$$;


create trigger comments_changed

after insert or delete

on public.comments

for each row

execute function public.update_comment_count();


-- ============================================================
-- 14. INDEXES
-- ============================================================

create index departments_college_idx
on public.departments(college_id);

create index subjects_department_idx
on public.subjects(department_id);

create index resources_subject_idx
on public.resources(subject_id);

create index resources_uploaded_by_idx
on public.resources(uploaded_by);

create index posts_college_idx
on public.posts(college_id);

create index posts_author_idx
on public.posts(author_id);

create index comments_post_idx
on public.comments(post_id);


-- ============================================================
-- 15. ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.colleges
enable row level security;

alter table public.profiles
enable row level security;

alter table public.departments
enable row level security;

alter table public.subjects
enable row level security;

alter table public.resources
enable row level security;

alter table public.posts
enable row level security;

alter table public.comments
enable row level security;

alter table public.post_votes
enable row level security;


-- ============================================================
-- 16. COLLEGE POLICIES
-- ============================================================

create policy "authenticated users can read colleges"

on public.colleges

for select

to authenticated

using (true);


-- ============================================================
-- 19. PROFILE POLICIES
-- ============================================================

create policy "authenticated users can read profiles"

on public.profiles

for select

to authenticated

using (true);


create policy "users can update own profile"

on public.profiles

for update

to authenticated

using (
  auth.uid() = id
)

with check (
  auth.uid() = id
);


-- ============================================================
-- 20. DEPARTMENT POLICIES
-- ============================================================

create policy "authenticated users can read departments"

on public.departments

for select

to authenticated

using (true);


-- ============================================================
-- 21. SUBJECT POLICIES
-- ============================================================

create policy "authenticated users can read subjects"

on public.subjects

for select

to authenticated

using (true);


-- ============================================================
-- 22. RESOURCE POLICIES
-- ============================================================

create policy "authenticated users can read resources"

on public.resources

for select

to authenticated

using (true);


create policy "users can upload own resources"

on public.resources

for insert

to authenticated

with check (
  auth.uid() = uploaded_by
);


create policy "users can update own resources"

on public.resources

for update

to authenticated

using (
  auth.uid() = uploaded_by
)

with check (
  auth.uid() = uploaded_by
);


create policy "users can delete own resources"

on public.resources

for delete

to authenticated

using (
  auth.uid() = uploaded_by OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);


-- ============================================================
-- 23. POST POLICIES
-- ============================================================

create policy "users can read college posts"

on public.posts

for select

to authenticated

using (
  college_id = (
    select college_id

    from public.profiles

    where id = auth.uid()
  )
);


create policy "users can create college posts"

on public.posts

for insert

to authenticated

with check (

  author_id = auth.uid()

  and

  college_id = (
    select college_id

    from public.profiles

    where id = auth.uid()
  )
);


create policy "users can update own posts"

on public.posts

for update

to authenticated

using (
  author_id = auth.uid()
)

with check (
  author_id = auth.uid()
);


create policy "users can delete own posts"

on public.posts

for delete

to authenticated

using (
  author_id = auth.uid()
);


-- ============================================================
-- 24. COMMENT POLICIES
-- ============================================================

create policy "users can read college comments"

on public.comments

for select

to authenticated

using (

  exists (

    select 1

    from public.posts p

    join public.profiles pr
      on pr.id = auth.uid()

    where p.id = comments.post_id

    and p.college_id = pr.college_id

  )
);


create policy "users can create comments"

on public.comments

for insert

to authenticated

with check (
  author_id = auth.uid()
);


create policy "users can update own comments"

on public.comments

for update

to authenticated

using (
  author_id = auth.uid()
)

with check (
  author_id = auth.uid()
);


create policy "users can delete own comments"

on public.comments

for delete

to authenticated

using (
  author_id = auth.uid()
);


-- ============================================================
-- 25. VOTE POLICIES
-- ============================================================

create policy "users can read votes"

on public.post_votes

for select

to authenticated

using (true);


create policy "users can create own votes"

on public.post_votes

for insert

to authenticated

with check (
  user_id = auth.uid()
);


create policy "users can update own votes"

on public.post_votes

for update

to authenticated

using (
  user_id = auth.uid()
)

with check (
  user_id = auth.uid()
);


create policy "users can delete own votes"

on public.post_votes

for delete

to authenticated

using (
  user_id = auth.uid()
);


-- ============================================================
-- 23. DEMO COLLEGE
-- ============================================================

insert into public.colleges (
  name,
  slug
)

values (
  'Demo College',
  'demo-college'
);


-- ============================================================
-- 24. DEMO DEPARTMENTS + SUBJECTS
-- ============================================================

do $$

declare

  college_id uuid;

  cse_dept_id uuid;

  ece_dept_id uuid;

begin

  -- Get demo college

  select id

  into college_id

  from public.colleges

  where slug = 'demo-college'

  limit 1;


  -- ----------------------------------------------------------
  -- IT
  -- ----------------------------------------------------------

  insert into public.departments (
    college_id,
    name
  )

  values (
    college_id,
    'Information Technology'
  )

  returning id into cse_dept_id;


  -- ----------------------------------------------------------
  -- IT SUBJECTS (2023 Regulations)
  -- ----------------------------------------------------------

  insert into public.subjects (
    department_id, year, semester, course_category, name, regulation_tag
  )
  values
  -- SEMESTER I (Year 1)
  (cse_dept_id, 1, 1, 'THEORY', 'Calculus and its Applications', '2023-2026'),
  (cse_dept_id, 1, 1, 'THEORY', 'Basics of Electrical and Electronics Systems', '2023-2026'),
  (cse_dept_id, 1, 1, 'THEORY', 'Applied Chemistry', '2023-2026'),
  (cse_dept_id, 1, 1, 'THEORY', 'C Programming', '2023-2026'),
  (cse_dept_id, 1, 1, 'THEORY', 'English Language Proficiency', '2023-2026'),
  (cse_dept_id, 1, 1, 'PRACTICALS', 'C Programming Laboratory', '2023-2026'),
  (cse_dept_id, 1, 1, 'PRACTICALS', 'Engineering Practices', '2023-2026'),
  (cse_dept_id, 1, 1, 'MANDATORY COURSES', 'Induction Programme', '2023-2026'),

  -- SEMESTER II (Year 1)
  (cse_dept_id, 1, 2, 'THEORY', 'Transforms and its Applications', '2023-2026'),
  (cse_dept_id, 1, 2, 'THEORY', 'Sensors for engineering applications', '2023-2026'),
  (cse_dept_id, 1, 2, 'THEORY', 'Communication Systems', '2023-2026'),
  (cse_dept_id, 1, 2, 'THEORY', 'Digital Logic Design', '2023-2026'),
  (cse_dept_id, 1, 2, 'THEORY', 'Python Programming', '2023-2026'),
  (cse_dept_id, 1, 2, 'PRACTICALS', 'Basic Science Laboratory', '2023-2026'),
  (cse_dept_id, 1, 2, 'PRACTICALS', 'Language Elective', '2023-2026'),
  (cse_dept_id, 1, 2, 'PRACTICALS', 'Engineering Graphics', '2023-2026'),
  (cse_dept_id, 1, 2, 'MANDATORY COURSES', 'Activity Point Programme -1', '2023-2026'),
  (cse_dept_id, 1, 2, 'MANDATORY COURSES', 'Foundations of Problem Solving', '2023-2026'),

  -- SEMESTER III (Year 2)
  (cse_dept_id, 2, 3, 'THEORY', 'Linear Algebra', '2023-2026'),
  (cse_dept_id, 2, 3, 'THEORY', 'Engineering Economics', '2023-2026'),
  (cse_dept_id, 2, 3, 'THEORY', 'Computer Architecture', '2023-2026'),
  (cse_dept_id, 2, 3, 'THEORY', 'Data Structures', '2023-2026'),
  (cse_dept_id, 2, 3, 'THEORY', 'Discrete Mathematics and Automata Theory', '2023-2026'),
  (cse_dept_id, 2, 3, 'PRACTICALS', 'Data Structures Laboratory', '2023-2026'),
  (cse_dept_id, 2, 3, 'PRACTICALS', 'Java Programming Laboratory', '2023-2026'),
  (cse_dept_id, 2, 3, 'PRACTICALS', 'Building Communication Skills', '2023-2026'),
  (cse_dept_id, 2, 3, 'MANDATORY COURSES', 'Environmental Science', '2023-2026'),
  (cse_dept_id, 2, 3, 'MANDATORY COURSES', 'Activity Point Programme', '2023-2026'),
  (cse_dept_id, 2, 3, 'MANDATORY COURSES', 'Heritage of Tamils', '2023-2026'),

  -- SEMESTER IV (Year 2)
  (cse_dept_id, 2, 4, 'THEORY', 'Probability, Stochastic Processes and Statistics', '2023-2026'),
  (cse_dept_id, 2, 4, 'THEORY', 'Database Management Systems', '2023-2026'),
  (cse_dept_id, 2, 4, 'THEORY', 'Operating Systems', '2023-2026'),
  (cse_dept_id, 2, 4, 'THEORY', 'Computer Networks', '2023-2026'),
  (cse_dept_id, 2, 4, 'PRACTICALS', 'Database Management Systems Laboratory', '2023-2026'),
  (cse_dept_id, 2, 4, 'PRACTICALS', 'Computer Networks Laboratory', '2023-2026'),
  (cse_dept_id, 2, 4, 'PRACTICALS', 'Embedded System Design Laboratory', '2023-2026'),
  (cse_dept_id, 2, 4, 'PRACTICALS', 'Problem Solving', '2023-2026'),
  (cse_dept_id, 2, 4, 'MANDATORY COURSES', 'Indian Constitution', '2023-2026'),
  (cse_dept_id, 2, 4, 'MANDATORY COURSES', 'Activity Point Programme', '2023-2026'),

  -- SEMESTER V (Year 3)
  (cse_dept_id, 3, 5, 'THEORY', 'Design and Analysis of Algorithms', '2023-2026'),
  (cse_dept_id, 3, 5, 'THEORY', 'Software Engineering', '2023-2026'),
  (cse_dept_id, 3, 5, 'THEORY', 'Internet of Things', '2023-2026'),
  (cse_dept_id, 3, 5, 'THEORY', 'Artificial Intelligence', '2023-2026'),
  (cse_dept_id, 3, 5, 'THEORY', 'Professional Elective I', '2023-2026'),
  (cse_dept_id, 3, 5, 'PRACTICALS', 'Design and Analysis of Algorithms Laboratory', '2023-2026'),
  (cse_dept_id, 3, 5, 'PRACTICALS', 'Internet of Things Laboratory', '2023-2026'),
  (cse_dept_id, 3, 5, 'PRACTICALS', 'Aptitude Skills', '2023-2026'),
  (cse_dept_id, 3, 5, 'MANDATORY COURSES', 'Activity Point Programme', '2023-2026'),

  -- SEMESTER VI (Year 3)
  (cse_dept_id, 3, 6, 'THEORY', 'Wireless Networks', '2023-2026'),
  (cse_dept_id, 3, 6, 'THEORY', 'Web Technologies', '2023-2026'),
  (cse_dept_id, 3, 6, 'THEORY', 'Analytics and Data Mining', '2023-2026'),
  (cse_dept_id, 3, 6, 'THEORY', 'Professional Elective II', '2023-2026'),
  (cse_dept_id, 3, 6, 'THEORY', 'Open Elective 1', '2023-2026'),
  (cse_dept_id, 3, 6, 'PRACTICALS', 'Analytics and Data Mining Laboratory', '2023-2026'),
  (cse_dept_id, 3, 6, 'PRACTICALS', 'Web Technologies Laboratory', '2023-2026'),
  (cse_dept_id, 3, 6, 'PRACTICALS', 'Innovation Practices', '2023-2026'),
  (cse_dept_id, 3, 6, 'PRACTICALS', 'Enhancing Arithmetic Problem Solving', '2023-2026'),

  -- SEMESTER VII (Year 4)
  (cse_dept_id, 4, 7, 'THEORY', 'Cloud and Edge Computing', '2023-2026'),
  (cse_dept_id, 4, 7, 'THEORY', 'Information Security Principles and Practices', '2023-2026'),
  (cse_dept_id, 4, 7, 'THEORY', 'Professional Elective III', '2023-2026'),
  (cse_dept_id, 4, 7, 'THEORY', 'Professional Elective IV', '2023-2026'),
  (cse_dept_id, 4, 7, 'THEORY', 'Open Elective II', '2023-2026'),
  (cse_dept_id, 4, 7, 'PRACTICALS', 'Mobile Application Development Laboratory', '2023-2026'),
  (cse_dept_id, 4, 7, 'PRACTICALS', 'Project Work I', '2023-2026'),

  -- SEMESTER VIII (Year 4)
  (cse_dept_id, 4, 8, 'THEORY', 'Professional Elective V', '2023-2026'),
  (cse_dept_id, 4, 8, 'THEORY', 'Professional Elective VI', '2023-2026'),
  (cse_dept_id, 4, 8, 'PRACTICALS', 'Project Work II', '2023-2026');

end $$;


-- ============================================================
-- 25. FINISHED
-- ============================================================

-- College Hub database schema successfully created.- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   S T O R A G E   S E T U P   F O R   R E S O U R C E S 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 
 
 - -   1 .   C r e a t e   t h e   b u c k e t 
 
 i n s e r t   i n t o   s t o r a g e . b u c k e t s   ( i d ,   n a m e ,   p u b l i c ) 
 
 v a l u e s   ( ' r e s o u r c e s ' ,   ' r e s o u r c e s ' ,   t r u e ) 
 
 o n   c o n f l i c t   ( i d )   d o   n o t h i n g ; 
 
 
 
 - -   2 .   A l l o w   p u b l i c   a c c e s s   t o   r e a d   f i l e s 
 
 c r e a t e   p o l i c y   " P u b l i c   A c c e s s " 
 
 o n   s t o r a g e . o b j e c t s   f o r   s e l e c t 
 
 t o   p u b l i c 
 
 u s i n g   (   b u c k e t _ i d   =   ' r e s o u r c e s '   ) ; 
 
 
 
 - -   3 .   A l l o w   a u t h e n t i c a t e d   u s e r s   t o   u p l o a d   f i l e s 
 
 c r e a t e   p o l i c y   " A u t h e n t i c a t e d   u s e r s   c a n   u p l o a d " 
 
 o n   s t o r a g e . o b j e c t s   f o r   i n s e r t 
 
 t o   a u t h e n t i c a t e d 
 
 w i t h   c h e c k   (   b u c k e t _ i d   =   ' r e s o u r c e s '   ) ; 
 
 
-- ============================================================
-- 26. COHORT VALIDATION TRIGGER (PSG TECH)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_psgtech_email()
RETURNS trigger
LANGUAGE plpgsql
AS $body
DECLARE
  v_email text;
  v_admission_year int;
  v_current_year int;
  v_academic_year int;
  v_academic_year_short int;
BEGIN
  v_email := NEW.email;

  -- 1. Check Domain
  IF v_email NOT LIKE '%@psgtech.ac.in' THEN
    RAISE EXCEPTION 'Unauthorized: Only @psgtech.ac.in emails are allowed.';
  END IF;

  -- 2. Extract admission year and department char
  -- Format is YYiXXX@psgtech.ac.in (e.g., 24i318)
  -- If it doesn't match the regex pattern, reject it.
  IF v_email !~ '^[0-9]{2}i[0-9]{3}@psgtech\.ac\.in$' THEN
    RAISE EXCEPTION 'Unauthorized: Invalid student email format. Must be Information Technology department (e.g., 24i318@psgtech.ac.in).';
  END IF;

  v_admission_year := CAST(SUBSTRING(v_email FROM 1 FOR 2) AS int);

  -- 3. Calculate current academic year (Assuming June is the start of the academic year)
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 6 THEN
    v_academic_year := v_current_year;
  ELSE
    v_academic_year := v_current_year - 1;
  END IF;

  -- Convert academic year to 2-digit format (e.g., 2026 -> 26)
  v_academic_year_short := v_academic_year % 100;

  -- 4. Check if student is in their 1st, 2nd, 3rd, or 4th year
  -- Valid admission years: academic_year, academic_year - 1, academic_year - 2, academic_year - 3
  IF v_admission_year > v_academic_year_short OR v_admission_year < (v_academic_year_short - 3) THEN
    RAISE EXCEPTION 'Unauthorized: Only current students (years 1-4) are allowed to access the portal.';
  END IF;

  RETURN NEW;
END;
$body;

DROP TRIGGER IF EXISTS validate_psgtech_email_trigger ON auth.users;
CREATE TRIGGER validate_psgtech_email_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.validate_psgtech_email();


-- ============================================================
-- 27. CLEANUP GRADUATED USERS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_graduated_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body
DECLARE
  v_current_year int;
  v_academic_year int;
  v_academic_year_short int;
BEGIN
  -- 1. Calculate current academic year
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 6 THEN
    v_academic_year := v_current_year;
  ELSE
    v_academic_year := v_current_year - 1;
  END IF;

  v_academic_year_short := v_academic_year % 100;

  -- 2. Delete users from auth.users who have graduated
  -- We identify graduated users if their admission year is < (v_academic_year_short - 3)
  -- Because auth.users is tied to public.profiles by CASCADE, this will delete their posts/resources too.
  DELETE FROM auth.users
  WHERE email ~ '^[0-9]{2}i[0-9]{3}@psgtech\.ac\.in$'
  AND CAST(SUBSTRING(email FROM 1 FOR 2) AS int) < (v_academic_year_short - 3);

END;
$body;
-- ============================================================
-- 28. CLEANUP OLD REGULATIONS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_regulations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body
DECLARE
  v_current_year int;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Delete subjects (and cascading notes/resources) belonging to a regulation
  -- that started more than 10 years ago.
  -- Example: In 2031, any regulation tag starting with a year <= 2021 (like '2019-2022') will be wiped.
  DELETE FROM public.subjects
  WHERE CAST(SUBSTRING(regulation_tag FROM 1 FOR 4) AS int) < (v_current_year - 10);

END;
$body;
