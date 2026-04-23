import { useState } from 'react';
import { useAppStore } from '../state/AppStore';

export function FeedbackHub() {
  const { snapshot, submitSuggestion } = useAppStore();
  const [kind, setKind] = useState<'IMPROVE' | 'REMOVE'>('IMPROVE');
  const [text, setText] = useState('');

  if (!snapshot) return null;

  return (
    <section className="panel">
      <div className="section-title">Feedback hub</div>
      <div className="button-row">
        <button className={kind === 'IMPROVE' ? 'secondary-btn active-btn' : 'ghost-btn'} onClick={() => setKind('IMPROVE')}>Improve</button>
        <button className={kind === 'REMOVE' ? 'secondary-btn active-btn' : 'ghost-btn'} onClick={() => setKind('REMOVE')}>Remove</button>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Tell the community team what should change." />
      <button className="primary-btn" onClick={() => { if (text.trim()) { submitSuggestion(text.trim(), kind); setText(''); } }}>Submit feedback</button>
      <div className="list">
        {snapshot.suggestions.map(item => (
          <div className="list-card vertical" key={item.id}>
            <strong>{item.userName} · {item.kind}</strong>
            <p>{item.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
