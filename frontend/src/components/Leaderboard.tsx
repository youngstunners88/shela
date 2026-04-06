import { useAppStore } from '../state/AppStore';

export function Leaderboard() {
  const { snapshot } = useAppStore();
  if (!snapshot) return null;

  const users = [...snapshot.users].sort((a, b) => b.points - a.points);

  return (
    <section className="panel">
      <div className="section-title">Leaderboard</div>
      <div className="list">
        {users.map((user, index) => (
          <div className="list-card" key={user.id}>
            <div>
              <strong>#{index + 1} {user.name}</strong>
              <p>{user.role}</p>
            </div>
            <div className="pill success">{user.points} pts</div>
          </div>
        ))}
      </div>
    </section>
  );
}
