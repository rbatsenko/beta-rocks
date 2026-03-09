-- Reverse the crowd rating scale so that 1=Empty, 5=Very crowded
-- Previously: 1=Very crowded, 5=Empty
-- Now: 1=Empty, 5=Very crowded
UPDATE reports
SET rating_crowds = 6 - rating_crowds
WHERE rating_crowds IS NOT NULL;

-- Reverse the wind rating scale so that 1=Calm, 5=Very windy
-- Previously: 1=Very windy, 5=Calm
-- Now: 1=Calm, 5=Very windy
UPDATE reports
SET rating_wind = 6 - rating_wind
WHERE rating_wind IS NOT NULL;
