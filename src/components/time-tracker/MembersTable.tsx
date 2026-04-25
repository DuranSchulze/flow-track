import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'
import { BarChart2, Pencil } from 'lucide-react'
import { gooeyToast } from 'goey-toast'
import { Input } from '#/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  setMemberStatusFn,
  updateMemberBillableRateFn,
  updateWorkspaceMemberFn,
} from '#/lib/server/tracker'
import {
  computeEffectiveRate,
  formatCurrency,
} from '#/lib/time-tracker/billing'
import { formatHours } from '#/lib/time-tracker/store'
import type { TrackerState } from '#/lib/time-tracker/types'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
  }
}

type Member = TrackerState['members'][number]

export type MemberStat = {
  memberId: string
  totalSeconds: number
  billableSeconds: number
  entryCount: number
  thisWeekSeconds: number
  thisMonthSeconds: number
  topProjects: Array<{ projectId: string; seconds: number }>
}

export function MembersTable({
  members,
  state,
  canManage,
  statsMap,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
}: {
  members: Member[]
  state: TrackerState
  canManage: boolean
  statsMap: Map<string, MemberStat>
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const columns = useMembersColumns(canManage)
  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (member) => member.id,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: page,
        pageSize,
      },
    },
  })
  const columnCount = table.getAllLeafColumns().length
  const firstItem = totalCount === 0 ? 0 : page * pageSize + 1
  const lastItem = Math.min((page + 1) * pageSize, totalCount)

  return (
    <div className="min-w-0 overflow-hidden">
      <Table className="min-w-[1120px] table-fixed">
        <TableHeader className="whitespace-nowrap bg-muted text-xs uppercase tracking-wide text-muted-foreground">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.columnDef.meta?.headerClassName}
                  style={{ width: header.column.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="px-5 py-8 text-center text-sm text-muted-foreground"
              >
                No members match your search.
              </TableCell>
            </TableRow>
          ) : (
            table
              .getRowModel()
              .rows.map((row) => (
                <MemberRow
                  key={row.id}
                  member={row.original}
                  state={state}
                  canManage={canManage}
                  columnCount={columnCount}
                  isSelf={row.original.id === state.currentMemberId}
                  stats={statsMap.get(row.original.id)}
                />
              ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Showing {firstItem}-{lastItem} of {totalCount} members
          </span>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    if (page > 0) onPageChange(page - 1)
                  }}
                  aria-disabled={page === 0}
                  className={page === 0 ? 'pointer-events-none opacity-40' : ''}
                />
              </PaginationItem>
              {getVisiblePages(page, totalPages).map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    onClick={(event) => {
                      event.preventDefault()
                      onPageChange(pageNumber)
                    }}
                  >
                    {pageNumber + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    if (page < totalPages - 1) onPageChange(page + 1)
                  }}
                  aria-disabled={page >= totalPages - 1}
                  className={
                    page >= totalPages - 1
                      ? 'pointer-events-none opacity-40'
                      : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

function useMembersColumns(canManage: boolean) {
  return useMemo(() => {
    const columnHelper = createColumnHelper<Member>()
    const columns = [
      columnHelper.accessor('name', {
        id: 'member',
        header: 'Member',
        size: 220,
        meta: { headerClassName: 'px-5 py-3' },
      }),
      columnHelper.accessor('roleName', {
        header: 'Role',
        size: 150,
        meta: { headerClassName: 'px-5 py-3' },
      }),
      columnHelper.accessor('departmentId', {
        header: 'Department',
        size: 160,
        meta: { headerClassName: 'px-5 py-3' },
      }),
      columnHelper.accessor('cohortIds', {
        header: 'Groups / cohorts',
        size: 220,
        meta: { headerClassName: 'px-5 py-3' },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        size: 120,
        meta: { headerClassName: 'px-5 py-3' },
      }),
    ]

    if (!canManage) return columns

    return [
      ...columns,
      columnHelper.accessor('billableRate', {
        header: 'Rate',
        size: 160,
        meta: { headerClassName: 'px-5 py-3 text-right' },
      }),
      columnHelper.display({
        id: 'thisWeek',
        header: 'This week',
        size: 110,
        meta: { headerClassName: 'px-5 py-3 text-right' },
      }),
      columnHelper.display({
        id: 'total',
        header: 'Total',
        size: 110,
        meta: { headerClassName: 'px-5 py-3 text-right' },
      }),
      columnHelper.display({
        id: 'billable',
        header: 'Billable',
        size: 110,
        meta: { headerClassName: 'px-5 py-3 text-right' },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 150,
        meta: { headerClassName: 'px-5 py-3' },
      }),
    ]
  }, [canManage])
}

function getVisiblePages(page: number, totalPages: number) {
  const start = Math.max(0, Math.min(page - 1, totalPages - 3))
  return Array.from({ length: Math.min(3, totalPages) }, (_, index) => {
    return start + index
  })
}

function MemberRow({
  member,
  state,
  canManage,
  columnCount,
  isSelf,
  stats,
}: {
  member: Member
  state: TrackerState
  canManage: boolean
  columnCount: number
  isSelf: boolean
  stats?: MemberStat
}) {
  const router = useRouter()
  const department = state.departments.find((d) => d.id === member.departmentId)
  const cohorts = state.cohorts.filter((c) => member.cohortIds.includes(c.id))
  const effectiveRate = computeEffectiveRate(
    member.billableRate,
    state.workspace.defaultBillableRate,
  )

  const [editing, setEditing] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [roleId, setRoleId] = useState(member.workspaceRoleId)
  const [deptId, setDeptId] = useState(member.departmentId)
  const [cohortIds, setCohortIds] = useState<string[]>(member.cohortIds)
  const [rate, setRate] = useState(
    member.billableRate == null ? '' : String(member.billableRate),
  )
  const [pending, setPending] = useState(false)
  const rateInput = rate.trim()
  const parsedRate = rateInput === '' ? null : Number(rateInput)
  const assignableCohorts = state.cohorts.filter(
    (cohort) => deptId && cohort.departmentId === deptId,
  )
  const rateInputInvalid =
    parsedRate !== null && (!Number.isFinite(parsedRate) || parsedRate < 0)

  function resetEditState() {
    setRoleId(member.workspaceRoleId)
    setDeptId(member.departmentId)
    setCohortIds(member.cohortIds)
    setRate(member.billableRate == null ? '' : String(member.billableRate))
    setEditing(false)
  }

  async function handleSave() {
    if (rateInputInvalid) {
      gooeyToast.error('Enter a valid hourly rate', {
        description: 'Use a positive number, or leave it blank for default.',
      })
      return
    }

    setPending(true)
    try {
      await Promise.all([
        updateWorkspaceMemberFn({
          data: {
            memberId: member.id,
            workspaceRoleId: roleId || undefined,
            departmentId: deptId || undefined,
            cohortIds,
          },
        }),
        updateMemberBillableRateFn({
          data: {
            memberId: member.id,
            billableRate: parsedRate,
          },
        }),
      ])
      await router.invalidate()
      setRate(parsedRate == null ? '' : String(parsedRate))
      gooeyToast.success('Member updated')
      setEditing(false)
    } catch (err) {
      gooeyToast.error('Could not update member', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  async function handleToggleStatus() {
    const next = member.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
    setPending(true)
    try {
      await setMemberStatusFn({ data: { memberId: member.id, status: next } })
      await router.invalidate()
      gooeyToast.success(
        `Member ${next === 'DISABLED' ? 'disabled' : 'reactivated'}`,
      )
    } catch (err) {
      gooeyToast.error('Could not update status', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setPending(false)
    }
  }

  function toggleCohort(id: string) {
    setCohortIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  if (editing && canManage) {
    return (
      <TableRow className="border-t border-border bg-muted">
        <TableCell className="px-5 py-4 align-top">
          <p className="m-0 whitespace-nowrap font-semibold text-foreground">
            {member.name}
          </p>
          <p className="m-0 mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
            {member.email}
          </p>
        </TableCell>
        <TableCell className="px-5 py-4 align-top">
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="h-8 w-full min-w-[130px] rounded border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">No role</option>
            {state.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </TableCell>
        <TableCell className="px-5 py-4 align-top">
          <select
            value={deptId}
            onChange={(e) => {
              const nextDepartmentId = e.target.value
              setDeptId(nextDepartmentId)
              setCohortIds((current) =>
                current.filter((cohortId) =>
                  state.cohorts.some(
                    (cohort) =>
                      cohort.id === cohortId &&
                      cohort.departmentId === nextDepartmentId,
                  ),
                ),
              )
            }}
            className="h-8 w-full min-w-[140px] rounded border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">Unassigned</option>
            {state.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </TableCell>
        <TableCell className="px-5 py-4 align-top">
          <div className="flex min-w-[200px] flex-wrap gap-1.5">
            {assignableCohorts.length === 0 && (
              <span className="text-xs text-muted-foreground">
                {deptId ? 'No cohorts in this department' : 'Select department'}
              </span>
            )}
            {assignableCohorts.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-foreground"
              >
                <input
                  type="checkbox"
                  checked={cohortIds.includes(c.id)}
                  onChange={() => toggleCohort(c.id)}
                  className="rounded"
                />
                {c.name}
              </label>
            ))}
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap px-5 py-4 align-top">
          <MemberStatusControl
            status={member.status}
            canToggle={!isSelf}
            pending={pending}
            onToggle={handleToggleStatus}
          />
        </TableCell>
        <TableCell className="px-5 py-4 text-right align-top text-sm text-muted-foreground">
          <div className="ml-auto grid min-w-[140px] gap-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder={`Default: ${state.workspace.defaultBillableRate}`}
              aria-invalid={rateInputInvalid}
              className="h-8 text-right text-xs"
            />
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              Blank uses default
            </span>
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap px-5 py-4 text-right align-top text-sm text-muted-foreground">
          {formatHours(stats?.thisWeekSeconds ?? 0)}
        </TableCell>
        <TableCell className="whitespace-nowrap px-5 py-4 text-right align-top text-sm text-muted-foreground">
          {formatHours(stats?.totalSeconds ?? 0)}
        </TableCell>
        <TableCell className="whitespace-nowrap px-5 py-4 text-right align-top text-sm text-muted-foreground">
          {formatHours(stats?.billableSeconds ?? 0)}
        </TableCell>
        <TableCell className="px-5 py-4 align-top">
          <div className="flex whitespace-nowrap gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || rateInputInvalid}
              className="h-7 rounded bg-primary px-3 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground"
            >
              {pending ? '...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={resetEditState}
              className="h-7 rounded border border-border px-2 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <TableRow className="border-t border-border">
        <TableCell className="px-5 py-4 align-top">
          <Link
            to="/app/workspace/members/$memberId"
            params={{ memberId: member.id }}
            className="whitespace-nowrap font-semibold text-foreground no-underline hover:text-primary"
          >
            {member.name}
          </Link>
          <p className="m-0 mt-1 whitespace-nowrap text-xs text-muted-foreground">
            {member.email}
          </p>
        </TableCell>
        <TableCell className="px-5 py-4 align-top">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  state.roles.find((r) => r.id === member.workspaceRoleId)
                    ?.color ?? '#94a3b8',
              }}
            />
            {member.roleName}
          </span>
        </TableCell>
        <TableCell className="px-5 py-4 align-top text-foreground">
          <span className="whitespace-nowrap">
            {department?.name || 'Unassigned'}
          </span>
        </TableCell>
        <TableCell className="px-5 py-4 align-top text-foreground">
          <span className="inline-block min-w-[180px] whitespace-nowrap">
            {cohorts.map((c) => c.name).join(', ') || 'None'}
          </span>
        </TableCell>
        <TableCell className="whitespace-nowrap px-5 py-4 align-top">
          <MemberStatusControl
            status={member.status}
            canToggle={canManage && !isSelf}
            pending={pending}
            onToggle={handleToggleStatus}
          />
        </TableCell>
        {canManage && (
          <>
            <TableCell className="whitespace-nowrap px-5 py-4 text-right align-top text-sm tabular-nums text-muted-foreground">
              {formatCurrency(effectiveRate, state.workspace.billableCurrency)}
              {member.billableRate == null && (
                <span className="ml-1 text-xs">(default)</span>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap px-5 py-4 text-right align-top text-sm tabular-nums text-muted-foreground">
              {formatHours(stats?.thisWeekSeconds ?? 0)}
            </TableCell>
            <TableCell className="whitespace-nowrap px-5 py-4 text-right align-top text-sm tabular-nums text-muted-foreground">
              {formatHours(stats?.totalSeconds ?? 0)}
            </TableCell>
            <TableCell className="whitespace-nowrap px-5 py-4 text-right align-top text-sm tabular-nums text-muted-foreground">
              {formatHours(stats?.billableSeconds ?? 0)}
            </TableCell>
            <TableCell className="px-5 py-4 align-top">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <IconBtn
                  onClick={() => setShowAnalytics((v) => !v)}
                  title="View analytics"
                  className={showAnalytics ? 'bg-primary/10 text-primary' : ''}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={() => setEditing(true)} title="Edit member">
                  <Pencil className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </TableCell>
          </>
        )}
      </TableRow>

      {canManage && showAnalytics && (
        <TableRow className="border-t border-border bg-muted/40">
          <TableCell colSpan={columnCount} className="px-5 pb-5 pt-3">
            <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wide text-primary">
              Analytics - {member.name}
            </p>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                {
                  label: 'This week',
                  value: formatHours(stats?.thisWeekSeconds ?? 0),
                },
                {
                  label: 'This month',
                  value: formatHours(stats?.thisMonthSeconds ?? 0),
                },
                {
                  label: 'All time',
                  value: formatHours(stats?.totalSeconds ?? 0),
                },
                {
                  label: 'Billable',
                  value: formatHours(stats?.billableSeconds ?? 0),
                },
                { label: 'Entries', value: String(stats?.entryCount ?? 0) },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <p className="m-0 text-xs text-muted-foreground">
                    {chip.label}
                  </p>
                  <p className="m-0 mt-0.5 text-lg font-bold text-foreground">
                    {chip.value}
                  </p>
                </div>
              ))}
            </div>

            {stats && stats.topProjects.length > 0 ? (
              <div>
                <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Top projects
                </p>
                <div className="grid gap-2">
                  {stats.topProjects.map(({ projectId, seconds }) => {
                    const project = state.projects.find(
                      (p) => p.id === projectId,
                    )
                    const pct =
                      stats.totalSeconds > 0
                        ? Math.round((seconds / stats.totalSeconds) * 100)
                        : 0
                    return (
                      <div key={projectId} className="flex items-center gap-3">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: project?.color ?? '#94a3b8',
                          }}
                        />
                        <span className="w-32 shrink-0 truncate text-sm text-foreground">
                          {project?.name ?? 'Unknown'}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {formatHours(seconds)}
                        </span>
                        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">
                No tracked entries yet.
              </p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function IconBtn({
  onClick,
  title,
  children,
  className = '',
}: {
  onClick: () => void
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1 text-muted-foreground transition-colors hover:text-foreground ${className}`}
    >
      {children}
    </button>
  )
}

function MemberStatusControl({
  status,
  canToggle,
  pending,
  onToggle,
}: {
  status: string
  canToggle: boolean
  pending: boolean
  onToggle: () => void
}) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-primary/15 text-primary',
    INVITED:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    DISABLED: 'bg-destructive/15 text-destructive',
  }
  const className = `rounded-lg px-2 py-1 text-xs font-bold ${styles[status] ?? 'bg-muted text-foreground'}`

  if (!canToggle) {
    return <span className={className}>{status}</span>
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      title={status === 'DISABLED' ? 'Reactivate member' : 'Disable member'}
      className={`${className} transition-colors hover:bg-accent disabled:opacity-50`}
    >
      {pending ? 'UPDATING' : status}
    </button>
  )
}
