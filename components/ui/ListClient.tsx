'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const MARKETS = ['EDEKA Titisee', 'REWE Neustadt', 'Other'] as const;

interface ListItem {
  id: string;
  trip_id: string;
  text: string;
  done: boolean;
  position: number;
  market?: string;
  created_by?: string;
}

interface ListClientProps {
  tripId: string;
  table: 'groceries' | 'frankfurt_items';
  initialItems: ListItem[];
  title: string;
  subtitle: string;
  placeholder: string;
  showMarket: boolean;
  footer?: string;
}

export default function ListClient({
  tripId,
  table,
  initialItems,
  title,
  subtitle,
  placeholder,
  showMarket,
  footer,
}: ListClientProps) {
  const [items, setItems]   = useState<ListItem[]>(initialItems);
  const [input, setInput]   = useState('');
  const [market, setMarket] = useState<string>('EDEKA Titisee');
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    const ch = supabase
      .channel(`${table}:${tripId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table, filter: `trip_id=eq.${tripId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev =>
            prev.some(it => it.id === payload.new.id)
              ? prev                                      // already added optimistically
              : [...prev, payload.new as ListItem]
          );
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(it => it.id === payload.new.id ? (payload.new as ListItem) : it));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(it => it.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tripId, table]);

  const openCount = items.filter(i => !i.done).length;

  async function addItem() {
    const text = input.trim();
    if (!text) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const base = { trip_id: tripId, text, done: false, position: items.length, created_by: user.id };
    const tempId = `temp-${Date.now()}`;
    setItems(prev => [...prev, { id: tempId, ...base, ...(showMarket ? { market } : {}) } as ListItem]);
    setInput('');
    inputRef.current?.focus();

    const inserted =
      table === 'groceries'
        ? await supabase.from('groceries').insert({ ...base, market }).select().single()
        : await supabase.from('frankfurt_items').insert(base).select().single();

    if (inserted.data) {
      const row = inserted.data as ListItem;
      setItems(prev => prev.map(it => (it.id === tempId ? row : it)));
    }
  }

  async function toggleItem(item: ListItem) {
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, done: !it.done } : it));
    await supabase.from(table).update({ done: !item.done }).eq('id', item.id);
  }

  async function deleteItem(item: ListItem) {
    if (!confirm(`Remove "${item.text}"?`)) return;
    setItems(prev => prev.filter(it => it.id !== item.id));
    await supabase.from(table).delete().eq('id', item.id);
  }

  return (
    <>
      <div className="large-title">
        <h1>{title}</h1>
        <div className="lt-sub">{subtitle} · {openCount} to buy</div>
      </div>

      {/* Add row */}
      <div className="group tight">
        <div className="card">
          <div className="add-row">
            <span className="add-ic"><i className="ti ti-plus" /></span>
            <input
              ref={inputRef}
              placeholder={placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
            />
            {input.trim() && (
              <button className="btn-link" style={{ fontWeight: 600 }} onClick={addItem}>Add</button>
            )}
          </div>
          {showMarket && (
            <div className="market-row">
              {MARKETS.map(m => (
                <button
                  key={m}
                  className={`market-pill${market === m ? ' active' : ''}`}
                  onClick={() => setMarket(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="group tight">
        <div className="card">
          {items.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px' }}>Nothing on the list yet — add your first item above.</div>
          ) : (
            items.map(item => (
              <div key={item.id} className={`rem${item.done ? ' done' : ''}`}>
                <button
                  className={`rem-check${item.done ? ' done' : ''}`}
                  onClick={() => toggleItem(item)}
                  aria-label={item.done ? 'Mark not done' : 'Mark done'}
                >
                  <i className={`ti ${item.done ? 'ti-circle-check-filled' : 'ti-circle'}`} />
                </button>
                <div className="rem-body">
                  <div className="rem-text">{item.text}</div>
                  {item.market && <div className="rem-meta">{item.market}</div>}
                </div>
                <button className="rem-del" onClick={() => deleteItem(item)} aria-label="Delete">
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {footer && <div className="group-footer">{footer}</div>}
    </>
  );
}
