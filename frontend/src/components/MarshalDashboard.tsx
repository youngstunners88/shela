import { useState } from 'react';
import { queueCapacityOptions } from '../constants';
import { useAppStore } from '../state/AppStore';

export function MarshalDashboard() {
  const { snapshot, answerQuestion, verifyAnswer, updateRankStatus } = useAppStore();
  const [rankId, setRankId] = useState(snapshot?.ranks[0]?.id ?? '');
  const [capacity, setCapacity] = useState<typeof queueCapacityOptions[number]>('MOVING');
  const [loadEstimate, setLoadEstimate] = useState(45);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!snapshot) return null;

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">Marshal rank control</div>
        <div className="form-grid three-col">
          <select value={rankId} onChange={e => setRankId(e.target.value)}>
            {snapshot.ranks.map(rank => <option key={rank.id} value={rank.id}>{rank.name}</option>)}
          </select>
          <select value={capacity} onChange={e => setCapacity(e.target.value as typeof capacity)}>
            {queueCapacityOptions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="number" min={0} max={100} value={loadEstimate} onChange={e => setLoadEstimate(Number(e.target.value))} />
        </div>
        <button className="primary-btn" onClick={() => updateRankStatus(rankId, capacity, loadEstimate)}>Publish rank update</button>
      </section>

      <section className="panel">
        <div className="section-title">Community fare questions</div>
        <div className="list">
          {snapshot.faqs.map(faq => (
            <div className="list-card vertical" key={faq.id}>
              <div>
                <strong>{faq.question}</strong>
                <p>{faq.answer ?? 'No answer yet.'}</p>
                <small>{faq.verifiedBy.length} verifications</small>
              </div>
              <textarea
                placeholder="Write or improve the answer"
                value={answers[faq.id] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [faq.id]: e.target.value }))}
              />
              <div className="button-row">
                <button className="secondary-btn" onClick={() => answerQuestion(faq.id, answers[faq.id] ?? '')}>Answer</button>
                <button className="ghost-btn" onClick={() => verifyAnswer(faq.id)}>Verify</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
