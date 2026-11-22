import { useMemo, useState } from 'react';
import { MockDspDriver } from '../packages/core/src/dsp/mock-driver';
import { LibraryColumn } from '../packages/ui/src/components/LibraryColumn';
import { QueueColumn } from '../packages/ui/src/components/QueueColumn';
import { createPreviewController, type PreviewPlan } from '../packages/ui/src/preview/controller';
import { createLibraryState } from '../packages/ui/src/state/library';
import { emptyQueueState, queueReducer } from '../packages/ui/src/state/queue';
import { createTimelineSelector, type TimelineTrack } from '../packages/ui/src/state/timeline';

const seededTracks = [
  { track_id: 'track-1', bpm: 120, camelot_key: '8A', energy_stars: 3, mixability: 0.8 },
  { track_id: 'track-2', bpm: 120, camelot_key: '8A', energy_stars: 3, mixability: 0.8 },
  { track_id: 'track-3', bpm: 120, camelot_key: '8A', energy_stars: 3, mixability: 0.8 },
] as const;

const library = createLibraryState(seededTracks);
const tracksById = new Map<string, TimelineTrack>(
  seededTracks.map((track) => [
    track.track_id,
    { trackId: track.track_id, t0Seconds: 0, bpm: track.bpm, durationSeconds: 1 },
  ]),
);

export function JourneyHarness() {
  const [queue, setQueue] = useState(emptyQueueState());
  const [planReady, setPlanReady] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [automationCount, setAutomationCount] = useState(0);
  const dsp = useMemo(() => new MockDspDriver(), []);
  const previewController = useMemo(() => createPreviewController({ dsp }), [dsp]);
  const timelineSelector = useMemo(
    () => createTimelineSelector((trackId) => tracksById.get(trackId) ?? null),
    [],
  );
  const timeline = timelineSelector(queue.queueIndex, queue.queueIndex.length);

  function playPreview() {
    const [fromTrackId, toTrackId] = queue.queueIndex;
    if (!fromTrackId || !toTrackId) return;

    const previewPlan: PreviewPlan = {
      fromTrackId,
      toTrackId,
      plan: {
        rung: 'RUNG_NONE',
        reason: 'E2E mock preview',
        tInSeconds: 0,
        tOutSeconds: 1,
        inBeatIndex: 1,
        outBeatIndex: 1,
        alignToSeconds: 0,
        mappedBpm: 120,
        windowBeats: 4,
      },
      slices: [
        { trackId: fromTrackId, startBeat: 0, endBeat: 2 },
        { trackId: toTrackId, startBeat: 2, endBeat: 4 },
      ],
    };
    previewController.play(previewPlan);
    setPreviewCount(previewController.getScheduled().length);
    setAutomationCount(dsp.getAutomationLog().length);
  }

  return (
    <main>
      <h1>OTOMIX P08 journey harness</h1>
      <p role="status">
        Seeded signed-in tenant; 3 uploaded tracks are ready in the library.
      </p>
      <section aria-label="Library and queue">
        <LibraryColumn
          rows={library.selectableIds.flatMap((id) => {
            const row = library.byId[id];
            return row ? [row] : [];
          })}
          onAdd={(trackId) =>
            setQueue((state) => queueReducer(state, { type: 'queue/add', trackId }))
          }
        />
        <QueueColumn
          queue={queue.queueIndex}
          onRemove={(trackId) =>
            setQueue((state) => queueReducer(state, { type: 'queue/remove', trackId }))
          }
          onReorder={(trackId, toIndex) =>
            setQueue((state) => queueReducer(state, { type: 'queue/reorder', trackId, toIndex }))
          }
        />
      </section>
      <output aria-label="Timeline">Timeline beats: {timeline.points.length}</output>
      <button
        type="button"
        disabled={queue.queueIndex.length < 2}
        onClick={() => setPlanReady(true)}
      >
        Build plan
      </button>
      <output aria-label="Plan status">
        {planReady ? 'Mix plan ready' : 'Mix plan not built'}
      </output>
      <button type="button" disabled={!planReady} onClick={playPreview}>
        Preview
      </button>
      <output aria-label="Preview status">
        Preview scheduled: {previewCount}
      </output>
      <output aria-label="DSP automation count">
        DSP automations: {automationCount}
      </output>
    </main>
  );
}
