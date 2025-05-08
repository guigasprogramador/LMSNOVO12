
-- Create Row Level Security Policies

-- Profiles policies
CREATE POLICY "Users can view their own profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profiles"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Courses policies (public readable)
CREATE POLICY "Courses are viewable by everyone"
  ON public.courses
  FOR SELECT
  USING (true);

-- Modules policies (public readable)
CREATE POLICY "Modules are viewable by everyone"
  ON public.modules
  FOR SELECT
  USING (true);

-- Lessons policies (public readable)
CREATE POLICY "Lessons are viewable by everyone"
  ON public.lessons
  FOR SELECT
  USING (true);

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments"
  ON public.enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrollments"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Lesson progress policies
CREATE POLICY "Users can view their own lesson progress"
  ON public.lesson_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lesson progress"
  ON public.lesson_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own lesson progress"
  ON public.lesson_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Certificates policies
CREATE POLICY "Users can view their own certificates"
  ON public.certificates
  FOR SELECT
  USING (auth.uid() = user_id);
