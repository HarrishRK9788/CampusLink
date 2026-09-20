'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'

type Department = { id: string; name: string }
type Subject = { id: string; department_id: string; year: number; semester: number; name: string; course_category: string; regulation_tag: string }

export function ResourceDrilldown({ departments, subjects }: { departments: Department[], subjects: Subject[] }) {
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [selectedReg, setSelectedReg] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number | ''>('')
  const [selectedSem, setSelectedSem] = useState<number | ''>('')

  const availableYears = selectedDept && selectedReg
    ? Array.from(new Set(subjects.filter(s => s.department_id === selectedDept && s.regulation_tag === selectedReg).map(s => s.year))).sort() 
    : []

  const availableSems = selectedYear 
    ? Array.from(new Set(subjects.filter(s => s.department_id === selectedDept && s.regulation_tag === selectedReg && s.year === selectedYear).map(s => s.semester))).sort()
    : []

  const filteredSubjects = subjects.filter(s => 
    s.department_id === selectedDept && 
    s.regulation_tag === selectedReg &&
    (selectedYear === '' || s.year === selectedYear) && 
    (selectedSem === '' || s.semester === selectedSem)
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter Subjects</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedDept} 
              onChange={(e) => {
                setSelectedDept(e.target.value)
                setSelectedYear('')
                setSelectedSem('')
              }}
            >
              <option value="">Choose Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Regulation</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedReg} 
              onChange={(e) => {
                setSelectedReg(e.target.value)
                setSelectedYear('')
                setSelectedSem('')
              }}
            >
              <option value="">Choose Regulation</option>
              <option value="2019-2022">2019-2022</option>
              <option value="2023-2026">2023-2026</option>
              <option value="2027-2030">2027-2030</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedYear} 
              onChange={(e) => {
                setSelectedYear(Number(e.target.value) || '')
                setSelectedSem('')
              }}
              disabled={!selectedDept || !selectedReg}
            >
              <option value="">All Years</option>
              {availableYears.map(y => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Semester</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedSem} 
              onChange={(e) => setSelectedSem(Number(e.target.value) || '')}
              disabled={!selectedYear}
            >
              <option value="">All Semesters</option>
              {availableSems.map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {filteredSubjects.length === 0 ? (
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Available Subjects</h2>
            <p className="text-muted-foreground mt-4">No subjects found for these filters.</p>
          </div>
        ) : (
          <>
            {['THEORY', 'PRACTICALS', 'MANDATORY COURSES'].map((category) => {
              const subjectsInCategory = filteredSubjects.filter(s => s.course_category === category)
              
              if (subjectsInCategory.length === 0) return null;

              return (
                <div key={category} className="space-y-4">
                  <h2 className="text-xl font-semibold tracking-tight">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjectsInCategory.map(subject => (
                      <Card key={subject.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{subject.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            Year {subject.year}, Sem {subject.semester} • {subject.regulation_tag}
                          </p>
                          <Link href={`/resources/subject/${subject.id}`} className={buttonVariants({ className: 'w-full' })}>View Notes</Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
