import {
  User,
  Group,
  TestWithQuestions,
  TestResult,
  ActiveTestProgress,
  Question
} from '../types';

const STORAGE_KEYS = {
  USERS: 'testhub_users_v1',
  GROUPS: 'testhub_groups_v1',
  TESTS: 'testhub_tests_v1',
  RESULTS: 'testhub_results_v1',
  SESSION: 'testhub_session_v1',
  DEMO_FLAG: 'testhub_is_demo_seeded',
};

// 30 days in milliseconds: 30 * 24 * 60 * 60 * 1000 = 2,592,000,000 ms
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionData {
  userId: string;
  expiresAt: number;
}

class DatabaseService {
  private users: User[] = [];
  private groups: Group[] = [];
  private tests: TestWithQuestions[] = [];
  private results: TestResult[] = [];
  private currentUser: User | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      const storedGroups = localStorage.getItem(STORAGE_KEYS.GROUPS);
      const storedTests = localStorage.getItem(STORAGE_KEYS.TESTS);
      const storedResults = localStorage.getItem(STORAGE_KEYS.RESULTS);

      if (storedUsers) this.users = JSON.parse(storedUsers);
      if (storedGroups) this.groups = JSON.parse(storedGroups);
      if (storedTests) this.tests = JSON.parse(storedTests);
      if (storedResults) this.results = JSON.parse(storedResults);

      // Seed default demo data if empty
      if (this.users.length === 0 || !localStorage.getItem(STORAGE_KEYS.DEMO_FLAG)) {
        this.seedDemoData();
      }

      // Check 30-day session
      this.restoreSession();
    } catch (e) {
      console.error('Storage initialization error:', e);
      this.seedDemoData();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(this.groups));
      localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(this.tests));
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(this.results));
    } catch (err) {
      console.error('Save to localStorage failed:', err);
    }
    this.notify();
  }

  // --- Session & Auth ---
  private restoreSession() {
    try {
      const rawSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (rawSession) {
        const session: SessionData = JSON.parse(rawSession);
        if (session.expiresAt > Date.now()) {
          const user = this.users.find(u => u.id === session.userId);
          if (user) {
            this.currentUser = user;
            return;
          }
        }
      }
    } catch (err) {
      console.error('Session restore failed:', err);
    }
    this.clearSession();
  }

  public setSession(user: User, keepLoggedIn30Days = true) {
    this.currentUser = user;
    const expiresAt = Date.now() + (keepLoggedIn30Days ? SESSION_EXPIRY_MS : 24 * 60 * 60 * 1000);
    const session: SessionData = {
      userId: user.id,
      expiresAt,
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    this.notify();
  }

  public clearSession() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    this.notify();
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public registerUser(data: {
    role: 'student' | 'teacher';
    firstName: string;
    lastName: string;
    phone: string;
    password?: string;
    groupIds?: string[];
  }): { success: boolean; error?: string; user?: User } {
    const cleanPhone = data.phone.trim().replace(/\s+/g, '');
    const cleanFirst = data.firstName.trim();
    const cleanLast = data.lastName.trim();

    if (!cleanFirst || !cleanLast) {
      return { success: false, error: 'Ism va familiyani kiritish majburiy!' };
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      return { success: false, error: "Telefon raqami noto'g'ri kiritilgan!" };
    }

    // Check existing phone for same role
    const existing = this.users.find(
      u => u.phone.replace(/\s+/g, '') === cleanPhone && u.role === data.role
    );
    if (existing) {
      return { success: false, error: "Ushbu telefon raqam bilan allaqachon ro'yxatdan o'tilgan!" };
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role: data.role,
      firstName: cleanFirst,
      lastName: cleanLast,
      phone: data.phone.trim(),
      password: data.password || '123456',
      groupIds: data.groupIds || [],
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.saveToStorage();
    this.setSession(newUser, true);
    return { success: true, user: newUser };
  }

  public loginUser(phone: string, role: 'student' | 'teacher', password?: string): { success: boolean; error?: string; user?: User } {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const user = this.users.find(
      u => u.phone.replace(/\s+/g, '') === cleanPhone && u.role === role
    );

    if (!user) {
      return {
        success: false,
        error: `Telefon raqami topilmadi. Iltimos avval ro'yxatdan o'ting!`,
      };
    }

    if (password && user.password && user.password !== password) {
      return { success: false, error: "Parol noto'g'ri kiritildi!" };
    }

    this.setSession(user, true);
    return { success: true, user };
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public getStudents(): User[] {
    return this.users.filter(u => u.role === 'student');
  }

  public updateUserGroups(studentId: string, groupIds: string[]) {
    const user = this.users.find(u => u.id === studentId);
    if (user) {
      user.groupIds = groupIds;
      if (this.currentUser?.id === studentId) {
        this.currentUser.groupIds = groupIds;
      }
      this.saveToStorage();
    }
  }

  // --- Groups Management ---
  public getGroups(): Group[] {
    return [...this.groups];
  }

  public getGroup(id: string): Group | undefined {
    return this.groups.find(g => g.id === id);
  }

  public createGroup(name: string, description = '', teacherId: string): Group {
    const newGroup: Group = {
      id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      createdByTeacherId: teacherId,
    };
    this.groups.push(newGroup);
    this.saveToStorage();
    return newGroup;
  }

  public renameGroup(groupId: string, newName: string, newDescription?: string): boolean {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return false;
    group.name = newName.trim();
    if (newDescription !== undefined) group.description = newDescription.trim();
    this.saveToStorage();
    return true;
  }

  public deleteGroup(groupId: string): boolean {
    this.groups = this.groups.filter(g => g.id !== groupId);
    // Unassign this group from users
    this.users.forEach(u => {
      if (u.groupIds && u.groupIds.includes(groupId)) {
        u.groupIds = u.groupIds.filter(id => id !== groupId);
      }
    });
    this.saveToStorage();
    return true;
  }

  public addStudentToGroup(studentId: string, groupId: string) {
    const student = this.users.find(u => u.id === studentId && u.role === 'student');
    if (student) {
      student.groupIds = student.groupIds || [];
      if (!student.groupIds.includes(groupId)) {
        student.groupIds.push(groupId);
        this.saveToStorage();
      }
    }
  }

  public removeStudentFromGroup(studentId: string, groupId: string) {
    const student = this.users.find(u => u.id === studentId);
    if (student && student.groupIds) {
      student.groupIds = student.groupIds.filter(gId => gId !== groupId);
      this.saveToStorage();
    }
  }

  public getStudentsInGroup(groupId: string): User[] {
    return this.users.filter(u => u.role === 'student' && u.groupIds?.includes(groupId));
  }

  // --- Tests Management ---
  public getTests(): TestWithQuestions[] {
    return [...this.tests];
  }

  public getTest(id: string): TestWithQuestions | undefined {
    return this.tests.find(t => t.id === id);
  }

  public saveTest(testData: Partial<TestWithQuestions> & { title: string; questions: Question[] }, teacherId: string): TestWithQuestions {
    const now = new Date().toISOString();
    let existing = testData.id ? this.tests.find(t => t.id === testData.id) : undefined;

    if (existing) {
      // Update
      Object.assign(existing, {
        title: testData.title.trim(),
        description: testData.description?.trim() || '',
        assignedGroupId: testData.assignedGroupId || 'all',
        timeLimitMinutes: Number(testData.timeLimitMinutes) || 0,
        allowedAttempts: Number(testData.allowedAttempts) || 0,
        passingPercentage: Number(testData.passingPercentage) || 60,
        startDate: testData.startDate || '',
        endDate: testData.endDate || '',
        shuffleQuestions: !!testData.shuffleQuestions,
        shuffleOptions: !!testData.shuffleOptions,
        showCorrectAnswers: testData.showCorrectAnswers ?? true,
        showExplanations: testData.showExplanations ?? true,
        isPublished: testData.isPublished ?? true,
        questions: testData.questions,
        updatedAt: now,
      });
      this.saveToStorage();
      return existing;
    } else {
      // Create
      const newTest: TestWithQuestions = {
        id: `tst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: testData.title.trim(),
        description: testData.description?.trim() || '',
        assignedGroupId: testData.assignedGroupId || 'all',
        timeLimitMinutes: Number(testData.timeLimitMinutes) || 0,
        allowedAttempts: Number(testData.allowedAttempts) || 0,
        passingPercentage: Number(testData.passingPercentage) || 60,
        startDate: testData.startDate || '',
        endDate: testData.endDate || '',
        shuffleQuestions: !!testData.shuffleQuestions,
        shuffleOptions: !!testData.shuffleOptions,
        showCorrectAnswers: testData.showCorrectAnswers ?? true,
        showExplanations: testData.showExplanations ?? true,
        isPublished: testData.isPublished ?? true,
        questions: testData.questions,
        createdByTeacherId: teacherId,
        createdAt: now,
        updatedAt: now,
      };
      this.tests.push(newTest);
      this.saveToStorage();
      return newTest;
    }
  }

  public deleteTest(testId: string): boolean {
    this.tests = this.tests.filter(t => t.id !== testId);
    this.saveToStorage();
    return true;
  }

  // --- Student Tests Filter ---
  public getAvailableTestsForStudent(student: User): {
    test: TestWithQuestions;
    attemptsCount: number;
    attemptsRemaining: number | 'unlimited';
    canTake: boolean;
    reason?: string;
  }[] {
    const studentGroupIds = student.groupIds || [];
    const now = new Date();

    return this.tests
      .filter(t => {
        if (!t.isPublished) return false;
        // Group assignment check
        if (t.assignedGroupId !== 'all' && !studentGroupIds.includes(t.assignedGroupId)) {
          return false;
        }
        return true;
      })
      .map(test => {
        const studentResults = this.results.filter(
          r => r.testId === test.id && r.studentId === student.id
        );
        const attemptsCount = studentResults.length;
        const maxAttempts = test.allowedAttempts;
        const attemptsRemaining = maxAttempts === 0 ? 'unlimited' : Math.max(0, maxAttempts - attemptsCount);

        let canTake = true;
        let reason = '';

        if (test.startDate) {
          const start = new Date(test.startDate);
          if (now < start) {
            canTake = false;
            reason = `Test hali boshlanmagan (${start.toLocaleString('uz-UZ')})`;
          }
        }

        if (test.endDate && canTake) {
          const end = new Date(test.endDate);
          if (now > end) {
            canTake = false;
            reason = `Test muddati tugagan (${end.toLocaleString('uz-UZ')})`;
          }
        }

        if (canTake && maxAttempts > 0 && attemptsCount >= maxAttempts) {
          canTake = false;
          reason = `Barcha urinishlardan foydalanildi (${attemptsCount}/${maxAttempts})`;
        }

        return {
          test,
          attemptsCount,
          attemptsRemaining,
          canTake,
          reason,
        };
      });
  }

  // --- Secure Scoring & Submissions ---
  public submitTestAttempt(data: {
    testId: string;
    student: User;
    answers: Record<string, string>;
    timeSpentSeconds: number;
    tabExitCount: number;
  }): TestResult {
    const test = this.tests.find(t => t.id === data.testId);
    if (!test) {
      throw new Error('Test topilmadi!');
    }

    // Calculate score securely using questions definitions
    let totalScore = 0;
    let maxScore = 0;

    test.questions.forEach(q => {
      const point = Number(q.points) || 1;
      maxScore += point;
      const studentAns = data.answers[q.id];
      if (studentAns && studentAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
        totalScore += point;
      }
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= test.passingPercentage;

    const group = test.assignedGroupId !== 'all'
      ? this.groups.find(g => g.id === test.assignedGroupId)
      : undefined;

    const previousAttempts = this.results.filter(
      r => r.testId === test.id && r.studentId === data.student.id
    ).length;

    const result: TestResult = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      testId: test.id,
      testTitle: test.title,
      studentId: data.student.id,
      studentFirstName: data.student.firstName,
      studentLastName: data.student.lastName,
      studentPhone: data.student.phone,
      groupId: test.assignedGroupId,
      groupName: group ? group.name : 'Barcha guruhlar',
      score: totalScore,
      maxScore,
      percentage,
      passed,
      timeSpentSeconds: Math.max(1, Math.round(data.timeSpentSeconds)),
      tabExitCount: data.tabExitCount,
      answers: data.answers,
      submittedAt: new Date().toISOString(),
      attemptNumber: previousAttempts + 1,
    };

    this.results.unshift(result);
    this.saveToStorage();

    // Clear active test progress from localStorage
    this.clearActiveProgress(test.id, data.student.id);

    return result;
  }

  // --- Active Test State Recovery ---
  public getActiveProgressKey(testId: string, studentId: string): string {
    return `testhub_active_${testId}_${studentId}`;
  }

  public saveActiveProgress(progress: ActiveTestProgress) {
    try {
      const key = this.getActiveProgressKey(progress.testId, progress.studentId);
      progress.lastSavedAt = Date.now();
      localStorage.setItem(key, JSON.stringify(progress));
    } catch (e) {
      console.warn('Active progress save failed:', e);
    }
  }

  public getActiveProgress(testId: string, studentId: string): ActiveTestProgress | null {
    try {
      const key = this.getActiveProgressKey(testId, studentId);
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Active progress get failed:', e);
    }
    return null;
  }

  public clearActiveProgress(testId: string, studentId: string) {
    try {
      const key = this.getActiveProgressKey(testId, studentId);
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Active progress clear failed:', e);
    }
  }

  // --- Results Management & Teacher Dashboard ---
  public getResults(): TestResult[] {
    return [...this.results];
  }

  public getResultsForStudent(studentId: string): TestResult[] {
    return this.results.filter(r => r.studentId === studentId);
  }

  public getResultsForTest(testId: string): TestResult[] {
    return this.results.filter(r => r.testId === testId);
  }

  public resetResult(resultId: string): boolean {
    const beforeCount = this.results.length;
    this.results = this.results.filter(r => r.id !== resultId);
    if (this.results.length !== beforeCount) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Students who have not completed a specific test
  public getUncompletedStudentsForTest(testId: string): User[] {
    const test = this.tests.find(t => t.id === testId);
    if (!test) return [];

    let eligibleStudents: User[] = [];
    if (test.assignedGroupId === 'all') {
      eligibleStudents = this.getStudents();
    } else {
      eligibleStudents = this.getStudentsInGroup(test.assignedGroupId);
    }

    const completedStudentIds = new Set(
      this.results.filter(r => r.testId === testId).map(r => r.studentId)
    );

    return eligibleStudents.filter(s => !completedStudentIds.has(s.id));
  }

  // --- Question Statistics ---
  public getQuestionStatistics(testId: string): {
    question: Question;
    number: number;
    totalAnswers: number;
    correctCount: number;
    incorrectCount: number;
    correctPercentage: number;
  }[] {
    const test = this.tests.find(t => t.id === testId);
    if (!test) return [];

    const testResults = this.results.filter(r => r.testId === testId);
    const totalResults = testResults.length;

    return test.questions.map((q, idx) => {
      let correct = 0;
      let incorrect = 0;

      testResults.forEach(r => {
        const studentAns = r.answers[q.id];
        if (studentAns) {
          if (studentAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          incorrect++;
        }
      });

      const answeredTotal = correct + incorrect;
      const pct = answeredTotal > 0 ? Math.round((correct / answeredTotal) * 100) : 0;

      return {
        question: q,
        number: idx + 1,
        totalAnswers: totalResults,
        correctCount: correct,
        incorrectCount: incorrect,
        correctPercentage: pct,
      };
    });
  }

  // --- Demo Seeding ---
  public seedDemoData() {
    const teacherId = 'demo_teacher_1';
    const teacher: User = {
      id: teacherId,
      role: 'teacher',
      firstName: 'Rustam',
      lastName: 'Qodirov',
      phone: '+998 90 123 45 67',
      password: 'teacher123',
      createdAt: new Date().toISOString(),
    };

    const g1: Group = {
      id: 'grp_matem_10',
      name: '10-A Matematika',
      description: 'Algebra va geometriya fani guruhi',
      createdAt: new Date().toISOString(),
      createdByTeacherId: teacherId,
    };
    const g2: Group = {
      id: 'grp_it_1',
      name: 'Dasturlash Asoslari',
      description: 'Web va Python dasturlash kursi',
      createdAt: new Date().toISOString(),
      createdByTeacherId: teacherId,
    };
    const g3: Group = {
      id: 'grp_fizika',
      name: 'Fizika va Tabiiy fanlar',
      description: 'Olimpiadaga tayyorgarlik',
      createdAt: new Date().toISOString(),
      createdByTeacherId: teacherId,
    };

    const students: User[] = [
      {
        id: 'std_1',
        role: 'student',
        firstName: 'Sardorbek',
        lastName: 'Alimov',
        phone: '+998 93 111 22 33',
        password: '123',
        groupIds: [g1.id, g2.id],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'std_2',
        role: 'student',
        firstName: 'Malika',
        lastName: 'Karimova',
        phone: '+998 94 222 33 44',
        password: '123',
        groupIds: [g1.id],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'std_3',
        role: 'student',
        firstName: 'Jasur',
        lastName: 'Toshmatov',
        phone: '+998 97 333 44 55',
        password: '123',
        groupIds: [g1.id, g3.id],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'std_4',
        role: 'student',
        firstName: 'Nodira',
        lastName: 'Rahimova',
        phone: '+998 99 444 55 66',
        password: '123',
        groupIds: [g2.id],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'std_5',
        role: 'student',
        firstName: 'Bobur',
        lastName: 'Umarov',
        phone: '+998 91 555 66 77',
        password: '123',
        groupIds: [g1.id, g2.id, g3.id],
        createdAt: new Date().toISOString(),
      },
    ];

    const test1Questions: Question[] = [
      {
        id: 'q_mat_1',
        text: 'Kvadrat tenglamaning diskriminanti D = b² - 4ac agar D > 0 bo\'lsa, tenglama nechta haqiqiy ildizga ega?',
        type: 'single',
        options: [
          { id: 'A', text: 'Bitta ildizga' },
          { id: 'B', text: 'Ikkita turli haqiqiy ildizga' },
          { id: 'C', text: 'Haqiqiy ildizga ega emas' },
          { id: 'D', text: 'Cheksiz ko\'p ildizga' },
        ],
        correctAnswer: 'B',
        points: 2,
        explanation: 'D > 0 bo\'lganda kvadrat tenglama ikkita haqiqiy va turli ildizga ega bo\'ladi: x₁,₂ = (-b ± √D) / (2a).',
      },
      {
        id: 'q_mat_2',
        text: 'Funksiya f(x) = x³ toq funksiya hisoblanadi.',
        type: 'boolean',
        options: [
          { id: 'A', text: 'Rost' },
          { id: 'B', text: 'Yolg\'on' },
        ],
        correctAnswer: 'A',
        points: 1,
        explanation: 'f(-x) = (-x)³ = -x³ = -f(x) bo\'lgani sababli toq funksiya.',
      },
      {
        id: 'q_mat_3',
        text: 'To\'g\'ri burchakli uchburchakda katetlari 6 va 8 bo\'lsa, gipotenuzasi nechaga teng?',
        type: 'single',
        options: [
          { id: 'A', text: '9' },
          { id: 'B', text: '10' },
          { id: 'C', text: '12' },
          { id: 'D', text: '14' },
        ],
        correctAnswer: 'B',
        points: 2,
        explanation: 'Pifagor teoremasi bo\'yicha: c = √(6² + 8²) = √(36 + 64) = √100 = 10.',
      },
      {
        id: 'q_mat_4',
        text: 'Nolga bo\'lish amali matematikada ma\'noga ega emas.',
        type: 'boolean',
        options: [
          { id: 'A', text: 'Rost' },
          { id: 'B', text: 'Yolg\'on' },
        ],
        correctAnswer: 'A',
        points: 1,
        explanation: 'Haqiqiy sonlar to\'plamida nolga bo\'lish taqiqlangan.',
      },
      {
        id: 'q_mat_5',
        text: 'Arifmetik progressiyada a₁ = 3, d = 4 bo\'lsa, 5-hadi (a₅) nechaga teng?',
        type: 'single',
        options: [
          { id: 'A', text: '15' },
          { id: 'B', text: '19' },
          { id: 'C', text: '23' },
          { id: 'D', text: '20' },
        ],
        correctAnswer: 'B',
        points: 2,
        explanation: 'a₅ = a₁ + 4d = 3 + 4 * 4 = 3 + 16 = 19.',
      },
    ];

    const test1: TestWithQuestions = {
      id: 'tst_demo_matem',
      title: 'Matematika: Funksiyalar va Tenglamalar',
      description: '10-sinf uchun umumiy nazorat testi. Savollar soni: 5 ta.',
      assignedGroupId: g1.id,
      timeLimitMinutes: 15,
      allowedAttempts: 2,
      passingPercentage: 60,
      shuffleQuestions: true,
      shuffleOptions: false,
      showCorrectAnswers: true,
      showExplanations: true,
      isPublished: true,
      questions: test1Questions,
      createdByTeacherId: teacherId,
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const test2Questions: Question[] = [
      {
        id: 'q_it_1',
        text: 'JavaScript tilida o\'zgarmas qiymat qaysi kalit so\'z orqali e\'lon qilinadi?',
        type: 'single',
        options: [
          { id: 'A', text: 'var' },
          { id: 'B', text: 'let' },
          { id: 'C', text: 'const' },
          { id: 'D', text: 'define' },
        ],
        correctAnswer: 'C',
        points: 1,
        explanation: 'const o\'zgarmaslarni e\'lon qilish uchun ishlatiladi.',
      },
      {
        id: 'q_it_2',
        text: 'HTML dasturlash tili emas, balki gipermatnli belgilash tili (markup language) hisoblanadi.',
        type: 'boolean',
        options: [
          { id: 'A', text: 'Rost' },
          { id: 'B', text: 'Yolg\'on' },
        ],
        correctAnswer: 'A',
        points: 1,
        explanation: 'HTML - HyperText Markup Language, mantiqiy algoritmlar yozilmaydi.',
      },
      {
        id: 'q_it_3',
        text: 'CSS qisqartmasining to\'liq ma\'nosi nima?',
        type: 'single',
        options: [
          { id: 'A', text: 'Creative Style Sheets' },
          { id: 'B', text: 'Cascading Style Sheets' },
          { id: 'C', text: 'Computer Style Syntax' },
          { id: 'D', text: 'Colorful Style Sheets' },
        ],
        correctAnswer: 'B',
        points: 1,
        explanation: 'CSS = Cascading Style Sheets.',
      },
      {
        id: 'q_it_4',
        text: 'Algoritm nima?',
        type: 'single',
        options: [
          { id: 'A', text: 'Faqat kompyuterda ishlaydigan dastur' },
          { id: 'B', text: 'Qo\'yilgan maqsadga erishish uchun bajarilishi lozim bo\'lgan aniq ko\'rsatmalar ketma-ketligi' },
          { id: 'C', text: 'Internet tarmog\'ining manzili' },
          { id: 'D', text: 'Ma\'lumotlar bazasidagi jadval' },
        ],
        correctAnswer: 'B',
        points: 2,
        explanation: 'Algoritm - natijaga olib boruvchi qadamlar ketma-ketligi.',
      },
    ];

    const test2: TestWithQuestions = {
      id: 'tst_demo_it',
      title: 'Informatika va Algoritmlar Asoslari',
      description: 'Dasturlash kursi talabalari uchun boshlang\'ich sinov.',
      assignedGroupId: 'all',
      timeLimitMinutes: 20,
      allowedAttempts: 3,
      passingPercentage: 70,
      shuffleQuestions: false,
      shuffleOptions: true,
      showCorrectAnswers: true,
      showExplanations: true,
      isPublished: true,
      questions: test2Questions,
      createdByTeacherId: teacherId,
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Pre-populate some completed results for realism
    const sampleResults: TestResult[] = [
      {
        id: 'res_demo_1',
        testId: test1.id,
        testTitle: test1.title,
        studentId: students[0].id,
        studentFirstName: students[0].firstName,
        studentLastName: students[0].lastName,
        studentPhone: students[0].phone,
        groupId: g1.id,
        groupName: g1.name,
        score: 8,
        maxScore: 8,
        percentage: 100,
        passed: true,
        timeSpentSeconds: 380,
        tabExitCount: 0,
        answers: {
          q_mat_1: 'B',
          q_mat_2: 'A',
          q_mat_3: 'B',
          q_mat_4: 'A',
          q_mat_5: 'B',
        },
        submittedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        attemptNumber: 1,
      },
      {
        id: 'res_demo_2',
        testId: test1.id,
        testTitle: test1.title,
        studentId: students[1].id,
        studentFirstName: students[1].firstName,
        studentLastName: students[1].lastName,
        studentPhone: students[1].phone,
        groupId: g1.id,
        groupName: g1.name,
        score: 6,
        maxScore: 8,
        percentage: 75,
        passed: true,
        timeSpentSeconds: 450,
        tabExitCount: 1,
        answers: {
          q_mat_1: 'B',
          q_mat_2: 'A',
          q_mat_3: 'C',
          q_mat_4: 'A',
          q_mat_5: 'B',
        },
        submittedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        attemptNumber: 1,
      },
      {
        id: 'res_demo_3',
        testId: test1.id,
        testTitle: test1.title,
        studentId: students[2].id,
        studentFirstName: students[2].firstName,
        studentLastName: students[2].lastName,
        studentPhone: students[2].phone,
        groupId: g1.id,
        groupName: g1.name,
        score: 4,
        maxScore: 8,
        percentage: 50,
        passed: false,
        timeSpentSeconds: 510,
        tabExitCount: 3,
        answers: {
          q_mat_1: 'A',
          q_mat_2: 'A',
          q_mat_3: 'B',
          q_mat_4: 'B',
          q_mat_5: 'A',
        },
        submittedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        attemptNumber: 1,
      },
      {
        id: 'res_demo_4',
        testId: test2.id,
        testTitle: test2.title,
        studentId: students[0].id,
        studentFirstName: students[0].firstName,
        studentLastName: students[0].lastName,
        studentPhone: students[0].phone,
        groupId: 'all',
        groupName: 'Barcha guruhlar',
        score: 5,
        maxScore: 5,
        percentage: 100,
        passed: true,
        timeSpentSeconds: 290,
        tabExitCount: 0,
        answers: {
          q_it_1: 'C',
          q_it_2: 'A',
          q_it_3: 'B',
          q_it_4: 'B',
        },
        submittedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        attemptNumber: 1,
      }
    ];

    this.users = [teacher, ...students];
    this.groups = [g1, g2, g3];
    this.tests = [test1, test2];
    this.results = sampleResults;
    localStorage.setItem(STORAGE_KEYS.DEMO_FLAG, 'true');
    this.saveToStorage();
  }

  public resetDatabaseToDefault() {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.GROUPS);
    localStorage.removeItem(STORAGE_KEYS.TESTS);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.DEMO_FLAG);
    this.seedDemoData();
  }
}

export const dbService = new DatabaseService();
