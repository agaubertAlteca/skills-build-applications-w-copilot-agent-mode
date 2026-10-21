import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { name: string; members?: string[]; description?: string; schedule?: string; maxAttendance?: number };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams: result }) => {
        if (!cancelled) setTeams(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {teams === null && !error && <p role="status">Loading teams...</p>}
        {error && <p role="alert">Unable to load teams. Please try again later.</p>}
        {teams?.length === 0 && <p>No teams yet.</p>}
        {teams && teams.length > 0 && (
          <ul>
            {teams.map((team) => (
              <li key={team.name}>
                <strong>{team.name}</strong>
                <p>Members: {team.members?.join(', ') || 'No members yet.'}</p>
                {team.description && <p>{team.description}</p>}
                {team.schedule && <p>Schedule: {team.schedule}</p>}
                {team.maxAttendance !== undefined && <p>Max attendance: {team.maxAttendance}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
