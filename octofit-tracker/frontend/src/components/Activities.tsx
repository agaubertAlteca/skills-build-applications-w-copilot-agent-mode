import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = { type: string; minutes: number; points: number };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then(({ activities: result }) => {
        if (!cancelled) setActivities(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Activities</h2>
        <p>Track student activity minutes and points.</p>
        {activities === null && !error && <p role="status">Loading activities...</p>}
        {error && <p role="alert">Unable to load activities. Please try again later.</p>}
        {activities?.length === 0 && <p>No activities yet.</p>}
        {activities && activities.length > 0 && (
          <ul>
            {activities.map((activity, index) => (
              <li key={`${activity.type}-${activity.minutes}-${index}`}>
                {activity.type}: {activity.minutes} minutes, {activity.points} points
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
