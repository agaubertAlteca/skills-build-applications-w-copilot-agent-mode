import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const objectIdPattern = /^[\da-f]{24}$/i;
  if (
    typeof userId !== 'string' || !objectIdPattern.test(userId) ||
    typeof teamId !== 'string' || !objectIdPattern.test(teamId) ||
    typeof type !== 'string' || type.trim().length === 0 ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw Object.assign(new Error('Activity user or team not found'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  const objectIdPattern = /^[\da-f]{24}$/i;
  if (
    typeof name !== 'string' || name.trim().length === 0 ||
    typeof mascot !== 'string' || mascot.trim().length === 0 ||
    (members !== undefined && (!Array.isArray(members) || !members.every((member) => typeof member === 'string' && objectIdPattern.test(member))))
  ) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const memberIds = members === undefined ? [] : [...new Set((members as string[]).map((member) => member.toLowerCase()))];
  const existingMembers = await User.countDocuments({ _id: { $in: memberIds } });
  if (existingMembers !== memberIds.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  return Team.create({ name, mascot, members: memberIds });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));

  return teams
    .map(({ _id, name }) => ({
      teamName: name,
      totalPoints: pointsByTeam.get(_id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).select('type').lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal.trim().toLowerCase();
  const activityFocusByType: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    walk: 'endurance',
    strength: 'strength',
    yoga: 'mobility',
    stretch: 'mobility',
  };
  const recentActivity = recentActivities[0]?.type;
  const recentFocus = recentActivity
    ? activityFocusByType[recentActivity.toLowerCase()] ?? recentActivity.toLowerCase()
    : undefined;

  return workouts
    .map((workout) => {
      const focus = workout.focus.trim().toLowerCase();
      const matchesGoal = focus === goal;
      const matchesActivity = focus === recentFocus;
      const reason = matchesGoal
        ? `Matches your ${goal} fitness goal${matchesActivity && recentActivity ? ` and recent ${recentActivity} activity` : ''}.`
        : matchesActivity && recentActivity
          ? `Builds on your recent ${recentActivity} activity.`
          : `Complements your ${goal} fitness goal.`;
      return { ...workout, reason, priority: matchesGoal ? 0 : matchesActivity ? 1 : 2 };
    })
    .sort((left, right) => left.priority - right.priority || (left.title ?? '').localeCompare(right.title ?? ''))
    .map(({ priority: _priority, ...workout }) => workout);
}

export { User };
