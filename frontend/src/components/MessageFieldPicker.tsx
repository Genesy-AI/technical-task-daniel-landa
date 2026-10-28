import { FC, useId, useState } from 'react'
import { IconSearch } from '@tabler/icons-react'
import { MESSAGE_FIELD_GROUPS, filterMessageFields } from '../utils/messageFields'

interface MessageFieldPickerProps {
  onInsert: (fieldKey: string) => void
}

export const MessageFieldPicker: FC<MessageFieldPickerProps> = ({ onInsert }) => {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const fields = filterMessageFields(query)

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <label htmlFor={searchId} className="block text-sm text-gray-600 mb-2">
        Insert field
      </label>
      <div className="relative mb-3">
        <IconSearch
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields..."
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="max-h-40 overflow-y-auto space-y-3">
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500">No fields match &quot;{query.trim()}&quot;</p>
        ) : (
          MESSAGE_FIELD_GROUPS.map((group) => {
            const groupFields = fields.filter((field) => field.group === group)
            if (groupFields.length === 0) return null

            return (
              <div key={group} role="group" aria-label={group}>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{group}</h4>
                <div className="flex flex-wrap gap-2">
                  {groupFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => onInsert(field.key)}
                      title={`Insert {${field.key}}`}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
