export interface QueueColumnProps {
  queue: readonly string[];
  onRemove?: (trackId: string) => void;
  onReorder?: (trackId: string, toIndex: number) => void;
  onDropTrack?: (trackId: string, toIndex: number) => void;
}

export function QueueColumn({ queue, onRemove, onReorder, onDropTrack }: QueueColumnProps) {
  if (queue.length === 0) {
    return <aside aria-label="Queue" className="queue-column"><p>Queue is empty</p></aside>;
  }

  return (
    <aside aria-label="Queue" className="queue-column">
      {queue.map((trackId, index) => (
        <div
          key={trackId}
          draggable
          onDragStart={(event) => event.dataTransfer.setData('text/plain', trackId)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const trackId = event.dataTransfer.getData('text/plain');
            if (trackId) onDropTrack?.(trackId, index);
          }}
        >
          <span>{index + 1}. {trackId}</span>
          {onRemove && (
            <button type="button" aria-label={`Remove ${trackId}`} onClick={() => onRemove(trackId)}>
              Remove
            </button>
          )}
          {onReorder && (
            <button type="button" aria-label={`Move ${trackId} up`} onClick={() => onReorder(trackId, Math.max(0, index - 1))}>
              Move up
            </button>
          )}
        </div>
      ))}
    </aside>
  );
}
