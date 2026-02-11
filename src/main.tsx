import { Devvit, useState, useInterval, useAsync } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
  redis: true,
  realtime: true,
});

const KING_KEY = 'current_king';
const START_TIME_KEY = 'throne_start_time';
const DAILY_RECORD_KEY = 'daily_longest_reign';
const DAILY_KING_KEY = 'daily_king';

Devvit.addCustomPostType({
  name: 'The Daily Throne',
  description: 'A social experiment - only one can rule',
  height: 'tall',
  render: (context) => {
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [updateTrigger, setUpdateTrigger] = useState(0);

    const { data: throneData, loading } = useAsync(async () => {
      const king = await context.redis.get(KING_KEY);
      const startTime = await context.redis.get(START_TIME_KEY);
      const dailyRecord = await context.redis.get(DAILY_RECORD_KEY);
      const dailyKing = await context.redis.get(DAILY_KING_KEY);

      return {
        king: king || null,
        startTime: startTime ? parseInt(startTime) : null,
        dailyRecord: dailyRecord ? parseInt(dailyRecord) : 0,
        dailyKing: dailyKing || 'None yet',
      };
    }, {
      depends: [updateTrigger],
    });

    useInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    const usurpThrone = async () => {
      const currentUser = context.userId;
      
      if (!currentUser) {
        context.ui.showToast('You must be logged in to claim the throne!');
        return;
      }

      const user = await context.reddit.getUserById(currentUser);
      const username = user?.username || 'Unknown';
      const now = Date.now();

      if (throneData?.king && throneData?.startTime) {
        const previousReignDuration = now - throneData.startTime;
        
        if (previousReignDuration > (throneData.dailyRecord || 0)) {
          await context.redis.set(DAILY_RECORD_KEY, previousReignDuration.toString());
          await context.redis.set(DAILY_KING_KEY, throneData.king);
        }
      }

      await context.redis.set(KING_KEY, username);
      await context.redis.set(START_TIME_KEY, now.toString());

      context.ui.showToast(`👑 You are now the King! All hail u/${username}!`);
      setUpdateTrigger(prev => prev + 1);
    };

    const formatTime = (ms: number): string => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      const h = hours.toString().padStart(2, '0');
      const m = (minutes % 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      
      return `${h}:${m}:${s}`;
    };

    if (loading) {
      return (
        <zstack width="100%" height="100%" alignment="center middle">
          <vstack alignment="center middle" gap="medium">
            <text size="xlarge" color="#FFD700">Loading the Throne...</text>
          </vstack>
        </zstack>
      );
    }

    const reignDuration = throneData?.startTime 
      ? currentTime - throneData.startTime 
      : 0;

    return (
      <zstack width="100%" height="100%" alignment="center middle">
        <vstack 
          width="100%" 
          height="100%" 
          alignment="center middle" 
          gap="large"
          padding="large"
          backgroundColor="#0a0a0a"
        >
          <vstack alignment="center middle" gap="small">
            <text size="xxlarge" weight="bold" color="#FFD700">
              👑 THE DAILY THRONE 👑
            </text>
            <text size="medium" color="#888888">
              A Social Experiment - Only One Can Rule
            </text>
            <text size="small" color="#666666">
              Click the button below to claim the throne!
            </text>
          </vstack>

          <vstack 
            alignment="center middle" 
            gap="medium" 
            padding="large"
            backgroundColor="#1a1a1a"
            cornerRadius="large"
            border="thick"
            borderColor="#FFD700"
          >
            <text size="large" color="#FFD700" weight="bold">
              CURRENT RULER
            </text>
            
            <text size="xxlarge" weight="bold" color="#FFFFFF">
              {throneData?.king ? `u/${throneData.king}` : 'The Throne is Empty'}
            </text>

            <vstack alignment="center middle" gap="small">
              <text size="medium" color="#888888">
                Reign Duration
              </text>
              <text size="xlarge" weight="bold" color="#FFD700">
                {formatTime(reignDuration)}
              </text>
            </vstack>
          </vstack>

          <button 
            onPress={usurpThrone}
            size="large"
            appearance="primary"
          >
            ⚔️ USURP THE THRONE ⚔️
          </button>

          <vstack 
            alignment="center middle" 
            gap="small" 
            padding="medium"
            backgroundColor="#1a1a1a"
            cornerRadius="medium"
          >
            <text size="medium" color="#FFD700" weight="bold">
              📊 TODAY'S LONGEST REIGN
            </text>
            <text size="large" color="#FFFFFF">
              {throneData?.dailyKing ? `u/${throneData.dailyKing}` : 'None yet'}
            </text>
            <text size="medium" color="#888888">
              {formatTime(throneData?.dailyRecord || 0)}
            </text>
          </vstack>

          <text size="small" color="#555555">
            Only one can rule. Will you take the throne?
          </text>
        </vstack>
      </zstack>
    );
  },
});

export default Devvit;
