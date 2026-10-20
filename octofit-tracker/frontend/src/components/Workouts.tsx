import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = { title: string; reason: string; focus?: string; minutes?: number };

const userEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions: result }) => {
        if (!cancelled) setSuggestions(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {suggestions === null && !error && <p role="status">Loading workout suggestions...</p>}
        {error && <p role="alert">Unable to load workout suggestions. Please try again later.</p>}
        {suggestions?.length === 0 && <p>No workout suggestions available.</p>}
        {suggestions && suggestions.length > 0 && (
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion.title}>
                <strong>{suggestion.title}</strong>
                {suggestion.focus && <span> ({suggestion.focus})</span>}
                {suggestion.minutes !== undefined && <span> · {suggestion.minutes} minutes</span>}
                <p>{suggestion.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
