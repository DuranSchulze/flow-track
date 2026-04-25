import { useState } from 'react'
import { gooeyToast } from 'goey-toast'
import { useRouter } from '@tanstack/react-router'
import {
  createManualEntryFn,
  createProjectFn,
  createTagFn,
  deleteEntryFn,
  duplicateEntryFn,
  startTimerFn,
  stopTimerFn,
  updateEntryFn,
} from '#/lib/server/tracker'

type StartTimerInput = {
  description: string
  projectId: string
  tagIds: string[]
  billable: boolean
}

type EntryPayload = {
  description: string
  projectId: string
  tagIds: string[]
  billable: boolean
  startedAt: string
  endedAt: string
  durationSeconds: number
  notes: string
}

export function useTrackerMutations() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<void>, successMessage?: string) {
    setPending(true)
    try {
      await action()
      await router.invalidate()
      if (successMessage) gooeyToast.success(successMessage)
    } catch (err) {
      gooeyToast.error('Action failed', {
        description:
          err instanceof Error ? err.message : 'Something went wrong.',
      })
    } finally {
      setPending(false)
    }
  }

  return {
    pending,
    startTimer: (input: StartTimerInput, onSuccess?: () => void) =>
      run(async () => {
        await startTimerFn({ data: input })
        onSuccess?.()
      }, 'Timer started'),
    stopTimer: (id: string) =>
      run(() => stopTimerFn({ data: { id } }), 'Timer stopped'),
    addManualEntry: (payload: EntryPayload, onSuccess?: () => void) =>
      run(async () => {
        await createManualEntryFn({ data: payload })
        onSuccess?.()
      }, 'Entry added'),
    updateEntry: (id: string, payload: EntryPayload, onSuccess?: () => void) =>
      run(async () => {
        await updateEntryFn({ data: { id, ...payload } })
        onSuccess?.()
      }, 'Entry saved'),
    deleteEntry: (id: string) =>
      run(() => deleteEntryFn({ data: { id } }), 'Entry deleted'),
    duplicateEntry: (id: string) =>
      run(() => duplicateEntryFn({ data: { id } }), 'Entry duplicated'),
    createProject: (name: string, color: string) =>
      run(
        () => createProjectFn({ data: { name, color } }),
        `Project "${name}" created`,
      ),
    createTag: (name: string, color: string) =>
      run(
        () => createTagFn({ data: { name, color } }),
        `Tag "${name}" created`,
      ),
  }
}
