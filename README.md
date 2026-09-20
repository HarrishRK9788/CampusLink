# CampusLink

CampusLink is an exclusive platform designed for students at PSG College of Technology (IT Department) to bridge the gap between seniors and juniors. It serves as a central hub for sharing study materials, asking questions, and collaborating across cohorts.

## 🚀 Features

* **Knowledge Base (Resources):** A centralized vault for uploading, organizing, and downloading PDF study materials, neatly categorized by semester and subject.
* **Discussion Board:** A real-time forum where students can ask questions, share insights, and upvote/downvote posts.
* **Secure Authentication:** Restricted login system that exclusively allows users with valid `@psgtech.ac.in` email addresses.
* **Smart Access Control:** Automatically restricts access to graduated cohorts while managing permissions for current 1st-4th year students.
* **Admin Moderation:** Built-in admin roles to moderate discussions and curate study materials to maintain a high-quality environment.
* **Dark Mode:** A sleek, modern UI with seamless dark/light mode toggling.

## 🛠️ Technology Stack

This project is built with modern, high-performance web technologies:

### Frontend
* **[Next.js](https://nextjs.org/)** - React framework using the modern App Router.
* **[React](https://reactjs.org/)** - For building dynamic user interfaces.
* **[TypeScript](https://www.typescriptlang.org/)** - For robust, type-safe code.
* **[Tailwind CSS](https://tailwindcss.com/)** - For utility-first, highly customizable styling.
* **[shadcn/ui](https://ui.shadcn.com/)** - Accessible, customizable UI components built on top of Radix UI.

### Backend & Database
* **[Supabase](https://supabase.com/)** - Open-source Firebase alternative serving as the core backend.
* **PostgreSQL** - Relational database for storing users, posts, comments, and votes.
* **Supabase Storage** - Secure cloud storage buckets for hosting PDF study materials.
* **Supabase Auth** - Handling user authentication and Google OAuth integration.

### Deployment
* **[Vercel](https://vercel.com/)** - High-performance edge network deployment for Next.js.

## 🔒 Security

* **Row Level Security (RLS):** Enforced at the database level to ensure users can only modify or delete their own content.
* **Domain Whitelisting:** Authentication is strictly locked to the college's domain via database triggers.

## 💻 Getting Started (Local Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/HarrishRK9788/CampusLink.git
   cd CampusLink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
