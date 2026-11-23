import { db, PRIORITY_LABEL, type Course, type Task } from '../lib/db'
import { dueInfo, fmt } from '../lib/dates'
import { CourseChip } from './Bits'
import { Icon } from './Icon'

interface Props {
  task: Task
  course?: Course
  now: Date
  compact?: boolean
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

export function TaskRow({ task, course, now, compact, onEdit, onDelete }: Props) {
  const info = dueInfo(task.deadline, task.done, now)
  return (
    <li className={`row${task.done ? ' is-done' : ''}`}>
      <label className="check">
        <input type="checkbox" checked={task.done} onChange={() => void db.tasks.update(task.id, { done: !task.done })} />
        <span className="sr-only">Tandai selesai: {task.title}</span>
      </label>
      <div className="row-body">
        <p className="row-title">{task.title}</p>
        <p className="row-meta">
                    <CourseChip course={course} />
          {task.meeting ? <span className="meeting-tag">Pertemuan {task.meeting}</span> : null}
          <span className={`due due-${info.tone}`}>
            <Icon name="clock" size={14} />
            {info.text}
          </span>
          {!compact && <span className="muted">{fmt(task.deadline, 'EEE, d MMM yyyy')}</span>}
        </p>
      </div>
      <span className={`prio prio-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
      {!compact && (
        <div className="row-actions">
          <button type="button" className="icon-btn" aria-label={`Ubah ${task.title}`} onClick={() => onEdit?.(task)}>
            <Icon name="edit" />
          </button>
          <button type="button" className="icon-btn" aria-label={`Hapus ${task.title}`} onClick={() => onDelete?.(task)}>
            <Icon name="trash" />
          </button>
        </div>
      )}
    </li>
  )
}
