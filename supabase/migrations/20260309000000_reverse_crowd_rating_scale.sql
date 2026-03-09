-- Reverse the crowd rating scale so that 1=Empty, 5=Very crowded
-- Previously: 1=Very crowded, 5=Empty
-- Now: 1=Empty, 5=Very crowded
UPDATE reports
SET rating_crowds = 6 - rating_crowds
WHERE rating_crowds IS NOT NULL;
