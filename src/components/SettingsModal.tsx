import { useTaskState, useTaskDispatch } from '../store/hooks'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const { settings } = useTaskState()
  const dispatch = useTaskDispatch()

  if (!open) return null

  function handleToggle() {
    void dispatch({ type: 'UPDATE_SETTINGS', payload: { allowOverlap: !settings.allowOverlap } })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Allow overlapping tasks</p>
            <p className="text-xs text-gray-400 mt-0.5">
              When off, tasks cannot share the same time slot
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.allowOverlap}
            onClick={() => { handleToggle() }}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.allowOverlap ? 'bg-violet-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                transition-transform ${settings.allowOverlap ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        <button
          onClick={() => { onClose() }}
          className="w-full border border-gray-200 text-gray-600 font-medium py-2.5
            rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
