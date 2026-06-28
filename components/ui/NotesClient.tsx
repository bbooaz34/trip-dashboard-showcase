'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cacheGet, cacheSet } from '@/lib/localCache';

interface NotesClientProps {
  tripId: string;
  initialBody: string;
}

export default function NotesClient({ tripId, initialBody }: NotesClientProps) {
  const cached = cacheGet('notes', '');
  const [body, setBody]     = useState(initialBody || cached);
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const ch = supabase
      .channel(`notes:${tripId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notes', filter: `trip_id=eq.${tripId}`,
      }, (payload) => {
        if (!timerRef.current) {
          setBody(payload.new.body as string);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tripId]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);
    setStatus('saving');
    cacheSet('notes', val);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('error'); return; }
      const { error } = await supabase.from('notes').upsert({
        trip_id: tripId, body: val,
        updated_by: user.id, updated_at: new Date().toISOString(),
      });
      setStatus(error ? 'error' : 'saved');
    }, 800);
  }

  const statusLabel = status === 'saving' ? 'Saving…' : status === 'error' ? 'Error saving' : 'Saved';

  return (
    <>
      <div className="large-title">
        <h1>Notes</h1>
        <div className="lt-sub">Shared with the crew</div>
      </div>

      <div className="group tight">
        <div className="card" style={{ padding: 0 }}>
          <textarea
            className="notes-area"
            value={body}
            onChange={handleChange}
            placeholder="Packing reminders, restaurant ideas, what the kids loved, addresses, contact numbers… anything you want to remember."
          />
        </div>
        <div className="group-footer" style={{ textAlign: 'right' }}>
          <span className={`save-status${status === 'error' ? ' err' : ''}`}>
            <span className="save-status-dot" />
            {statusLabel}
          </span>
        </div>
      </div>
    </>
  );
}
