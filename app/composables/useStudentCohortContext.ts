import type { StudentSection } from './usePeopleDirectory'
import { selectableCoopSemester } from './useCoopCycles'

export const getStudentCohortYear = (studentId: string): string => {
  const shortYear = studentId.match(/^(\d{2})/)?.[1]
  return shortYear ? `25${shortYear}` : 'ไม่ระบุรุ่น'
}

export const getStudentSemester = (cycle?: string): string => cycle?.split('/')[0] ?? 'ไม่ระบุภาคเรียน'

export const getStudentAcademicYear = (cycle?: string): string | undefined => cycle?.match(/\/(\d{4})$/)?.[1]

// Imported students may not have a cycle enrollment yet. Keep them in directory
// views so staff can see and assign the missing academic context.
export const isStudentVisibleForCoopSemester = (cycle?: string): boolean =>
  !cycle || getStudentSemester(cycle) === selectableCoopSemester

export const getDefaultStudentCohort = (students: Array<{ id: string, cycle?: string }>): string => {
  const years = students
    .filter(student => isStudentVisibleForCoopSemester(student.cycle))
    .map(student => getStudentCohortYear(student.id))
    .filter(year => year !== 'ไม่ระบุรุ่น')
  return [...new Set(years)].sort((a, b) => b.localeCompare(a, 'th'))[0] ?? 'all'
}

type StudentDirectoryPerson = {
  firstName: string
  lastName: string
  section?: string
}

const sectionNumber = (section?: string) => Number(section?.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER)

export const compareStudentDirectoryPeople = (a: StudentDirectoryPerson, b: StudentDirectoryPerson): number => {
  const sectionComparison = sectionNumber(a.section) - sectionNumber(b.section)
  if (sectionComparison !== 0) return sectionComparison
  return `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`, 'th')
}

export const useStudentCohortContext = () => {
  const { people } = usePeopleDirectory()
  const studentCohort = useState<string>('student-context-cohort', () => 'all')
  const studentSection = useState<string>('student-context-section', () => 'all')
  const studentSemester = useState<string>('student-context-semester', () => selectableCoopSemester)
  const studentCohortOptions = computed(() => {
    const years = [...new Set(people.value
      .filter(person => person.type === 'student')
      .map(person => getStudentCohortYear(person.id)))]
      .sort((a, b) => b.localeCompare(a, 'th'))

    return [
      { value: 'all', label: 'ทุกรุ่น' },
      ...years.map(year => ({ value: year, label: `รุ่นปี ${year}` })),
    ]
  })
  const selectedStudentCohortLabel = computed(() => studentCohortOptions.value
    .find(option => option.value === studentCohort.value)?.label ?? 'ทุกรุ่น')
  const studentSectionOptions = computed(() => {
    const sections = [...new Set(people.value
      .filter(person => person.type === 'student')
      .filter(person => studentCohort.value === 'all' || getStudentCohortYear(person.id) === studentCohort.value)
      .map(person => person.section)
      .filter((section): section is StudentSection => Boolean(section)))]
      .sort((a, b) => a.localeCompare(b, 'th', { numeric: true }))

    return [
      { value: 'all', label: 'ทุกหมู่' },
      ...sections.map(section => ({ value: section, label: section })),
    ]
  })
  const selectedStudentSectionLabel = computed(() => studentSectionOptions.value
    .find(option => option.value === studentSection.value)?.label ?? 'ทุกหมู่')
  const studentSemesterOptions = computed(() => [
    { value: selectableCoopSemester, label: selectableCoopSemester },
  ])
  const selectedStudentSemesterLabel = computed(() => studentSemesterOptions.value
    .find(option => option.value === studentSemester.value)?.label ?? selectableCoopSemester)
  const ensureAvailableStudentFilters = () => {
    if (!studentSectionOptions.value.some(option => option.value === studentSection.value)) {
      studentSection.value = 'all'
    }
    if (!studentSemesterOptions.value.some(option => option.value === studentSemester.value)) {
      studentSemester.value = selectableCoopSemester
    }
  }

  return {
    studentCohort,
    studentCohortOptions,
    studentSection,
    studentSectionOptions,
    studentSemester,
    studentSemesterOptions,
    ensureAvailableStudentFilters,
    selectedStudentCohortLabel,
    selectedStudentSectionLabel,
    selectedStudentSemesterLabel,
  }
}
