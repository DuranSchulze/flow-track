import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { gooeyToast } from 'goey-toast'
import {
  createCohortFn,
  createDepartmentFn,
  createProjectFn,
  createTagFn,
  createWorkspaceRoleFn,
} from '#/lib/server/tracker'
import type { RolePermission, TrackerState } from '#/lib/time-tracker/types'
import {
  ColorInput,
  FormTitle,
  inputClass,
  SubmitButton,
} from './CatalogFormParts'

export function RoleForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [permissionLevel, setPermissionLevel] =
    useState<RolePermission>('EMPLOYEE')
  const [color, setColor] = useState('#6366f1')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createWorkspaceRoleFn({ data: { name, permissionLevel, color } })
      await router.invalidate()
      gooeyToast.success('Role created')
      setName('')
      setPermissionLevel('EMPLOYEE')
      setColor('#6366f1')
    } catch (err) {
      gooeyToast.error('Could not create role', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <FormTitle title="Create role" />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Role name"
        required
        className={inputClass}
      />
      <select
        value={permissionLevel}
        onChange={(event) =>
          setPermissionLevel(event.target.value as RolePermission)
        }
        className={inputClass}
      >
        <option value="EMPLOYEE">Employee</option>
        <option value="MANAGER">Manager</option>
        <option value="ADMIN">Admin</option>
        <option value="OWNER">Owner</option>
      </select>
      <ColorInput value={color} onChange={setColor} />
      <SubmitButton pending={pending} label="Create role" />
    </form>
  )
}

export function ColorCatalogForm({
  title,
  placeholder,
  defaultColor,
  onCreate,
}: {
  title: string
  placeholder: string
  defaultColor: string
  onCreate: (data: { name: string; color: string }) => Promise<void>
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultColor)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await onCreate({ name, color })
      await router.invalidate()
      gooeyToast.success(`${title} created`)
      setName('')
      setColor(defaultColor)
    } catch (err) {
      gooeyToast.error(`Could not create ${title.toLowerCase()}`, {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <FormTitle title={`Create ${title.toLowerCase()}`} />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={placeholder}
        required
        className={inputClass}
      />
      <ColorInput value={color} onChange={setColor} />
      <SubmitButton pending={pending} label={`Create ${title.toLowerCase()}`} />
    </form>
  )
}

export function ProjectForm() {
  return (
    <ColorCatalogForm
      title="Project"
      placeholder="Project name"
      defaultColor="#2563eb"
      onCreate={(data) => createProjectFn({ data })}
    />
  )
}

export function TagForm() {
  return (
    <ColorCatalogForm
      title="Tag"
      placeholder="Tag name"
      defaultColor="#14b8a6"
      onCreate={(data) => createTagFn({ data })}
    />
  )
}

export function DepartmentForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await createDepartmentFn({
        data: { name, description: description || undefined, color },
      })
      await router.invalidate()
      gooeyToast.success('Department created')
      setName('')
      setDescription('')
      setColor('#6366f1')
    } catch (err) {
      gooeyToast.error('Could not create department', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <FormTitle title="Create department" />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Department name"
        required
        className={inputClass}
      />
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Description"
        className={inputClass}
      />
      <ColorInput value={color} onChange={setColor} />
      <SubmitButton pending={pending} label="Create department" />
    </form>
  )
}

export function CohortForm({
  departments,
}: {
  departments: TrackerState['departments']
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!departmentId) {
      gooeyToast.error('Select a department first')
      return
    }
    setPending(true)
    try {
      await createCohortFn({ data: { name, departmentId } })
      await router.invalidate()
      gooeyToast.success('Cohort created')
      setName('')
    } catch (err) {
      gooeyToast.error('Could not create cohort', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <FormTitle title="Create group / cohort" />
      <select
        value={departmentId}
        onChange={(event) => setDepartmentId(event.target.value)}
        required
        className={inputClass}
      >
        <option value="">Choose department</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Group or cohort name"
        required
        className={inputClass}
      />
      <SubmitButton pending={pending} label="Create cohort" />
    </form>
  )
}
