import { useState, useMemo, useRef } from 'react';
import {
  User,
  Group,
  TestWithQuestions,
  TestResult,
  Question,
  ParsedQuestionItem
} from '../types';
import { dbService } from '../storage/db';
import { parseQuestionsFromText } from '../utils/parser';
import { exportResultsToExcelCSV } from '../utils/csv';
import mammoth from 'mammoth';
import {
  Users,
  Layers,
  FileText,
  BarChart3,
  Award,
  Plus,
  Trash2,
  Edit2,
  Download,
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  Check,
  ChevronDown,
  Clock,
  Sparkles,
  HelpCircle,
  Eye,
  Settings,
  BookOpen,
  UserPlus,
  UserMinus,
  FileSpreadsheet
} from 'lucide-react';

interface TeacherDashboardProps {
  teacher: User;
  onPreviewTestAsStudent?: (test: TestWithQuestions) => void;
}

export function TeacherDashboard({ teacher }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<'tests' | 'groups' | 'students' | 'results' | 'statistics'>('tests');

  // Database states
  const groups = useMemo(() => dbService.getGroups(), []);
  const students = useMemo(() => dbService.getStudents(), []);
  const tests = useMemo(() => dbService.getTests(), []);
  const allResults = useMemo(() => dbService.getResults(), []);

  // UI trigger to force re-render when database changes
  const [, setRefreshTick] = useState(0);
  const refresh = () => setRefreshTick(t => t + 1);

  // ==========================================
  // 1. GROUPS MANAGEMENT
  // ==========================================
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<Group | null>(null);
  const [showAddStudentToGroupModal, setShowAddStudentToGroupModal] = useState(false);

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;

    if (editingGroupId) {
      dbService.renameGroup(editingGroupId, groupNameInput, groupDescInput);
    } else {
      dbService.createGroup(groupNameInput, groupDescInput, teacher.id);
    }

    setGroupNameInput('');
    setGroupDescInput('');
    setEditingGroupId(null);
    setShowCreateGroupModal(false);
    refresh();
  };

  const handleDeleteGroup = (groupId: string, name: string) => {
    if (window.confirm(`"${name}" guruhini o'chirishni tasdiqlaysizmi? Guruhdagi o'quvchilar saqlanib qoladi.`)) {
      dbService.deleteGroup(groupId);
      if (selectedGroupForMembers?.id === groupId) {
        setSelectedGroupForMembers(null);
      }
      refresh();
    }
  };

  // ==========================================
  // 2. TEST CREATION & EDITING
  // ==========================================
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [assignedGroupId, setAssignedGroupId] = useState('all');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(15);
  const [allowedAttempts, setAllowedAttempts] = useState<number>(1);
  const [passingPercentage, setPassingPercentage] = useState<number>(60);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);
  const [isPublished, setIsPublished] = useState(true);

  // Questions in test being edited
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [testEditorSubTab, setTestEditorSubTab] = useState<'settings' | 'questions' | 'import'>('settings');

  // Manual Question Builder state
  const [manualQuestionText, setManualQuestionText] = useState('');
  const [manualQuestionType, setManualQuestionType] = useState<'single' | 'boolean'>('single');
  const [manualOptions, setManualOptions] = useState<Array<{ id: string; text: string }>>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [manualCorrectAnswer, setManualCorrectAnswer] = useState('A');
  const [manualPoints, setManualPoints] = useState(1);
  const [manualExplanation, setManualExplanation] = useState('');

  // Importer states (Text & DOCX)
  const [pasteText, setPasteText] = useState('');
  const [parsedPreviewItems, setParsedPreviewItems] = useState<ParsedQuestionItem[]>([]);
  const [docxLoading, setDocxLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreateTestModal = () => {
    setEditingTestId(null);
    setTestTitle('');
    setTestDescription('');
    setAssignedGroupId('all');
    setTimeLimitMinutes(20);
    setAllowedAttempts(1);
    setPassingPercentage(60);
    setStartDate('');
    setEndDate('');
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setShowCorrectAnswers(true);
    setShowExplanations(true);
    setIsPublished(true);
    setCurrentQuestions([]);
    setTestEditorSubTab('settings');
    setPasteText('');
    setParsedPreviewItems([]);
    setShowTestModal(true);
  };

  const openEditTestModal = (test: TestWithQuestions) => {
    setEditingTestId(test.id);
    setTestTitle(test.title);
    setTestDescription(test.description || '');
    setAssignedGroupId(test.assignedGroupId || 'all');
    setTimeLimitMinutes(test.timeLimitMinutes || 0);
    setAllowedAttempts(test.allowedAttempts || 0);
    setPassingPercentage(test.passingPercentage || 60);
    setStartDate(test.startDate || '');
    setEndDate(test.endDate || '');
    setShuffleQuestions(!!test.shuffleQuestions);
    setShuffleOptions(!!test.shuffleOptions);
    setShowCorrectAnswers(test.showCorrectAnswers ?? true);
    setShowExplanations(test.showExplanations ?? true);
    setIsPublished(test.isPublished ?? true);
    setCurrentQuestions([...test.questions]);
    setTestEditorSubTab('settings');
    setPasteText('');
    setParsedPreviewItems([]);
    setShowTestModal(true);
  };

  // Add manual question
  const handleAddManualQuestion = () => {
    if (!manualQuestionText.trim()) {
      alert("Savol matnini kiriting!");
      return;
    }

    let finalOptions = manualOptions;
    if (manualQuestionType === 'boolean') {
      finalOptions = [
        { id: 'A', text: 'Rost' },
        { id: 'B', text: 'Yolg\'on' },
      ];
    } else {
      const empty = finalOptions.filter(o => !o.text.trim());
      if (empty.length > 0) {
        alert("Barcha variantlar matnini to'ldiring!");
        return;
      }
    }

    const newQ: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: manualQuestionText.trim(),
      type: manualQuestionType,
      options: finalOptions,
      correctAnswer: manualCorrectAnswer,
      points: manualPoints > 0 ? manualPoints : 1,
      explanation: manualExplanation.trim() || undefined,
    };

    setCurrentQuestions(prev => [...prev, newQ]);

    // reset builder
    setManualQuestionText('');
    setManualOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ]);
    setManualCorrectAnswer('A');
    setManualPoints(1);
    setManualExplanation('');
  };

  // Parse text input
  const handleParseText = () => {
    if (!pasteText.trim()) return;
    const parsed = parseQuestionsFromText(pasteText);
    setParsedPreviewItems(parsed);
  };

  // DOCX file upload parser using mammoth
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocxLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = result.value;
      setPasteText(rawText);
      const parsed = parseQuestionsFromText(rawText);
      setParsedPreviewItems(parsed);
    } catch (err) {
      console.error('DOCX parsing error:', err);
      alert("DOCX faylini o'qishda xatolik yuz berdi. Iltimos matnni nusxalab joylashtiring.");
    } finally {
      setDocxLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Apply parsed questions to test
  const handleApplyImportedQuestions = () => {
    const invalidItems = parsedPreviewItems.filter(p => !p.isValid);
    if (invalidItems.length > 0) {
      if (!window.confirm(`${invalidItems.length} ta savolda xatoliklar mavjud. Faqat to'g'ri shakllangan (${parsedPreviewItems.length - invalidItems.length} ta) savollarni yuklashni xohlaysizmi?`)) {
        return;
      }
    }

    const validQuestions = parsedPreviewItems.filter(p => p.isValid).map(p => p.question);
    if (validQuestions.length === 0) {
      alert("Yuklash uchun to'g'ri shakllangan savollar topilmadi.");
      return;
    }

    setCurrentQuestions(prev => [...prev, ...validQuestions]);
    setParsedPreviewItems([]);
    setPasteText('');
    setTestEditorSubTab('questions');
  };

  // Save entire test
  const handleSaveTest = () => {
    if (!testTitle.trim()) {
      alert("Test nomini kiriting!");
      setTestEditorSubTab('settings');
      return;
    }

    if (currentQuestions.length === 0) {
      alert("Testda kamida bitta savol bo'lishi kerak!");
      setTestEditorSubTab('questions');
      return;
    }

    dbService.saveTest({
      id: editingTestId || undefined,
      title: testTitle,
      description: testDescription,
      assignedGroupId,
      timeLimitMinutes,
      allowedAttempts,
      passingPercentage,
      startDate,
      endDate,
      shuffleQuestions,
      shuffleOptions,
      showCorrectAnswers,
      showExplanations,
      isPublished,
      questions: currentQuestions,
    }, teacher.id);

    setShowTestModal(false);
    refresh();
  };

  const handleDeleteTest = (testId: string, title: string) => {
    if (window.confirm(`"${title}" testini o'chirishni tasdiqlaysizmi?`)) {
      dbService.deleteTest(testId);
      refresh();
    }
  };

  // ==========================================
  // 3. RESULTS & RESET ATTEMPTS
  // ==========================================
  const [resultsFilterGroup, setResultsFilterGroup] = useState<string>('all');
  const [resultsFilterTest, setResultsFilterTest] = useState<string>('all');
  const [resultsFilterStatus, setResultsFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [resultsSearchQuery, setResultsSearchQuery] = useState('');
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);

  const [resetConfirmResult, setResetConfirmResult] = useState<TestResult | null>(null);

  // Filtered results
  const filteredResults = useMemo(() => {
    return allResults.filter(r => {
      if (resultsFilterGroup !== 'all' && r.groupId !== resultsFilterGroup) {
        return false;
      }
      if (resultsFilterTest !== 'all' && r.testId !== resultsFilterTest) {
        return false;
      }
      if (resultsFilterStatus === 'passed' && !r.passed) return false;
      if (resultsFilterStatus === 'failed' && r.passed) return false;

      if (resultsSearchQuery.trim()) {
        const q = resultsSearchQuery.toLowerCase();
        const fullName = `${r.studentFirstName} ${r.studentLastName}`.toLowerCase();
        const phone = r.studentPhone.toLowerCase();
        const testName = r.testTitle.toLowerCase();
        if (!fullName.includes(q) && !phone.includes(q) && !testName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allResults, resultsFilterGroup, resultsFilterTest, resultsFilterStatus, resultsSearchQuery]);

  // Pagination slice
  const paginatedResults = useMemo(() => {
    const start = (resultsPage - 1) * resultsPerPage;
    return filteredResults.slice(start, start + resultsPerPage);
  }, [filteredResults, resultsPage, resultsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / resultsPerPage));

  // Reset attempt handler
  const handleConfirmReset = () => {
    if (!resetConfirmResult) return;
    dbService.resetResult(resetConfirmResult.id);
    setResetConfirmResult(null);
    refresh();
  };

  // Excel / CSV Export handler
  const handleExportCSV = () => {
    const success = exportResultsToExcelCSV(filteredResults, `test_natijalari_${Date.now()}.csv`);
    if (!success) {
      alert("Eksport qilish uchun natijalar mavjud emas!");
    }
  };

  // Not completed students for selected test
  const notCompletedStudents = useMemo(() => {
    if (resultsFilterTest === 'all') return [];
    return dbService.getUncompletedStudentsForTest(resultsFilterTest);
  }, [resultsFilterTest, allResults]);

  // ==========================================
  // 4. QUESTION STATISTICS
  // ==========================================
  const [selectedStatTestId, setSelectedStatTestId] = useState<string>(tests[0]?.id || '');
  const questionStats = useMemo(() => {
    if (!selectedStatTestId) return [];
    return dbService.getQuestionStatistics(selectedStatTestId);
  }, [selectedStatTestId, allResults, tests]);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins} daq ${remainder} soniya`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">
              O'qituvchi Boshqaruv Markazi
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              O'qituvchi
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Xush kelibsiz, <strong>{teacher.firstName} {teacher.lastName}</strong>! Guruhlar, testlar va natijalarni to'liq boshqaring.
          </p>
        </div>

        {/* Global Action: New Test Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateTestModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Yangi test yaratish
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'tests'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Testlar ({tests.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'groups'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Guruhlar ({groups.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'students'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          O'quvchilar ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Award className="w-4 h-4" />
          Natijalar jadvali ({allResults.length})
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'statistics'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Savollar tahlili
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: TESTS LIST */}
      {/* ========================================================= */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">
              Mavjud testlar ro'yxati
            </h3>
            <button
              onClick={openCreateTestModal}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Yangi test
            </button>
          </div>

          {tests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h4 className="font-bold text-gray-800 text-sm">Hozircha testlar mavjud emas</h4>
              <p className="text-xs text-gray-500 mb-4">Birinchi testingizni yarating yoki matndan import qiling.</p>
              <button
                onClick={openCreateTestModal}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                Test yaratish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map(test => {
                const groupObj = groups.find(g => g.id === test.assignedGroupId);
                const testResultsCount = allResults.filter(r => r.testId === test.id).length;

                return (
                  <div
                    key={test.id}
                    className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          {groupObj ? groupObj.name : 'Barcha guruhlar'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          test.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {test.isPublished ? 'Faol' : 'Qoralama'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-gray-900 leading-snug mb-1">
                        {test.title}
                      </h4>
                      {test.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                          {test.description}
                        </p>
                      )}

                      <div className="space-y-1.5 py-3 border-y border-gray-100 text-xs text-gray-600 mb-4">
                        <div className="flex justify-between">
                          <span>Savollar:</span>
                          <strong className="text-gray-900">{test.questions.length} ta</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Vaqt chegarasi:</span>
                          <strong className="text-gray-900">
                            {test.timeLimitMinutes > 0 ? `${test.timeLimitMinutes} daqiqa` : 'Cheklovsiz'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>O'tish foizi:</span>
                          <strong className="text-gray-900">{test.passingPercentage}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Topshirilgan urinishlar:</span>
                          <strong className="text-blue-600 font-bold">{testResultsCount} ta</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => openEditTestModal(test)}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Tahrirlash
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTest(test.id, test.title)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GROUPS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Groups list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Guruhlar</h3>
                <button
                  onClick={() => {
                    setEditingGroupId(null);
                    setGroupNameInput('');
                    setGroupDescInput('');
                    setShowCreateGroupModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Yangi guruh
                </button>
              </div>

              <div className="space-y-2">
                {groups.map(g => {
                  const memberCount = dbService.getStudentsInGroup(g.id).length;
                  const isSelected = selectedGroupForMembers?.id === g.id;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupForMembers(g)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 shadow-xs'
                          : 'bg-gray-50/70 border-gray-200/80 hover:bg-gray-100'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{g.name}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{g.description || "Tavsif yo'q"}</p>
                        <span className="text-[10px] font-semibold text-blue-600 mt-1 inline-block">
                          {memberCount} ta o'quvchi
                        </span>
                      </div>

                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupId(g.id);
                            setGroupNameInput(g.name);
                            setGroupDescInput(g.description || '');
                            setShowCreateGroupModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded-md"
                          title="Nomini o'zgartirish"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g.id, g.name)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md"
                          title="Guruhni o'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Group Members View */}
          <div className="lg:col-span-2 space-y-4">
            {selectedGroupForMembers ? (
              <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      "{selectedGroupForMembers.name}" a'zolari
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedGroupForMembers.description || 'Guruh a\'zolari va test biriktirish'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddStudentToGroupModal(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    O'quvchi qo'shish
                  </button>
                </div>

                {dbService.getStudentsInGroup(selectedGroupForMembers.id).length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-xs">
                    Ushbu guruhda hali o'quvchilar yo'q. "O'quvchi qo'shish" tugmasini bosing.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {dbService.getStudentsInGroup(selectedGroupForMembers.id).map(std => (
                      <div key={std.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {std.firstName[0]}
                            {std.lastName[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900">
                              {std.firstName} {std.lastName}
                            </div>
                            <div className="text-[11px] text-gray-500">{std.phone}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`"${std.firstName} ${std.lastName}"ni ushbu guruhdan chiqarishni xohlaysizmi?`)) {
                              dbService.removeStudentFromGroup(std.id, selectedGroupForMembers.id);
                              refresh();
                            }
                          }}
                          className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 transition"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Guruhdan chiqarish
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center text-xs text-gray-500">
                Guruh a'zolarini ko'rish va boshqarish uchun chap tomondagi ro'yxatdan guruhni tanlang.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ALL STUDENTS */}
      {/* ========================================================= */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">
              Ro'yxatdan o'tgan barcha o'quvchilar ({students.length})
            </h3>
            <span className="text-xs text-gray-500">O'quvchi hisoblarining holati</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">O'quvchi</th>
                  <th className="py-3 px-4">Telefon</th>
                  <th className="py-3 px-4">Biriktirilgan guruhlar</th>
                  <th className="py-3 px-4 text-center">Topshirilgan testlar</th>
                  <th className="py-3 px-4 text-center">O'rtacha foiz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(std => {
                  const stdResults = allResults.filter(r => r.studentId === std.id);
                  const stdAvg = stdResults.length > 0
                    ? Math.round(stdResults.reduce((acc, r) => acc + r.percentage, 0) / stdResults.length)
                    : 0;
                  const stdGroupNames = groups
                    .filter(g => std.groupIds?.includes(g.id))
                    .map(g => g.name);

                  return (
                    <tr key={std.id} className="hover:bg-gray-50 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {std.firstName} {std.lastName}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono">
                        {std.phone}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {stdGroupNames.length > 0 ? (
                            stdGroupNames.map((name, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Guruhsiz</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                        {stdResults.length} ta
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-bold ${stdAvg >= 60 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {stdResults.length > 0 ? `${stdAvg}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: RESULTS TABLE & RESET ATTEMPTS & EXCEL EXPORT */}
      {/* ========================================================= */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="O'quvchi yoki testni qidirish..."
                    value={resultsSearchQuery}
                    onChange={e => {
                      setResultsSearchQuery(e.target.value);
                      setResultsPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Excel / CSV Export button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel / CSV formatida yuklab olish ({filteredResults.length})
              </button>
            </div>

            {/* Filter selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 text-xs">
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Guruh bo'yicha filter:</label>
                <select
                  value={resultsFilterGroup}
                  onChange={e => {
                    setResultsFilterGroup(e.target.value);
                    setResultsPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50"
                >
                  <option value="all">Barcha guruhlar</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Test bo'yicha filter:</label>
                <select
                  value={resultsFilterTest}
                  onChange={e => {
                    setResultsFilterTest(e.target.value);
                    setResultsPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50"
                >
                  <option value="all">Barcha testlar</option>
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Holati:</label>
                <select
                  value={resultsFilterStatus}
                  onChange={e => {
                    setResultsFilterStatus(e.target.value as any);
                    setResultsPage(1);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50"
                >
                  <option value="all">Barchasi</option>
                  <option value="passed">Faqat o'tganlar (&ge; o'tish balli)</option>
                  <option value="failed">Faqat o'tmaganlar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">O'quvchi</th>
                    <th className="py-3 px-4">Guruh</th>
                    <th className="py-3 px-4">Test</th>
                    <th className="py-3 px-4">Sana</th>
                    <th className="py-3 px-4 text-center">Ball</th>
                    <th className="py-3 px-4 text-center">Foiz</th>
                    <th className="py-3 px-4 text-center">Holat</th>
                    <th className="py-3 px-4">Vaqt</th>
                    <th className="py-3 px-4 text-center">Oynadan chiqish</th>
                    <th className="py-3 px-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400">
                        Tanlangan filtrlar bo'yicha hech qanday natija topilmadi.
                      </td>
                    </tr>
                  ) : (
                    paginatedResults.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {r.studentFirstName} {r.studentLastName}
                          <div className="text-[11px] text-gray-400 font-normal">{r.studentPhone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-medium">
                          {r.groupName}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          {r.testTitle}
                          <div className="text-[10px] text-gray-400 font-normal">Urinish #{r.attemptNumber}</div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                          {new Date(r.submittedAt).toLocaleDateString('uz-UZ', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                          {r.score} / {r.maxScore}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <strong className={r.passed ? 'text-emerald-600' : 'text-red-600'}>
                            {r.percentage}%
                          </strong>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.passed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {r.passed ? 'O\'tdi' : 'O\'tmadi'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {formatSeconds(r.timeSpentSeconds)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              r.tabExitCount > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {r.tabExitCount} marta
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setResetConfirmResult(r)}
                            title="Natijani bekor qilish / Qayta urinish imkonini berish"
                            className="px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-300 font-semibold flex items-center gap-1 transition ml-auto"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Qayta o'rnatish
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredResults.length > resultsPerPage && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div>
                  Jami <strong>{filteredResults.length}</strong> ta natijadan{' '}
                  {(resultsPage - 1) * resultsPerPage + 1} -{' '}
                  {Math.min(filteredResults.length, resultsPage * resultsPerPage)} ko'rsatilmoqda
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={resultsPage === 1}
                    onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40"
                  >
                    Oldingi
                  </button>
                  <span className="px-2 font-bold text-gray-700">
                    {resultsPage} / {totalPages}
                  </span>
                  <button
                    disabled={resultsPage === totalPages}
                    onClick={() => setResultsPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40"
                  >
                    Keyingi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Students who have NOT completed the selected test */}
          {resultsFilterTest !== 'all' && (
            <div className="bg-amber-50/50 rounded-3xl p-5 border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Testni hali topshirmagan o'quvchilar ({notCompletedStudents.length} nafar)
                </h4>
              </div>

              {notCompletedStudents.length === 0 ? (
                <p className="text-xs text-emerald-700 font-medium">
                  Ajoyib! Ushbu test uchun biriktirilgan barcha o'quvchilar kamida bir marta test topshirgan.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {notCompletedStudents.map(s => (
                    <div key={s.id} className="p-2.5 bg-white rounded-xl border border-amber-200/80 text-xs">
                      <div className="font-bold text-gray-800">{s.firstName} {s.lastName}</div>
                      <div className="text-[11px] text-gray-500">{s.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: QUESTION STATISTICS */}
      {/* ========================================================= */}
      {activeTab === 'statistics' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Savollar tahlili va qiyinlik darajasi</h3>
              <p className="text-xs text-gray-500">
                O'quvchilar qaysi savollarda ko'proq qiynalayotganini aniqlash vositasi
              </p>
            </div>

            <div className="w-full sm:w-72">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Testni tanlang:</label>
              <select
                value={selectedStatTestId}
                onChange={e => setSelectedStatTestId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 text-xs font-semibold"
              >
                {tests.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          {questionStats.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center text-xs text-gray-400">
              Ushbu test bo'yicha hali savollar statistikasi mavjud emas yoki natijalar topshirilmagan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questionStats.map(stat => {
                let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                let levelText = 'Oson';
                if (stat.correctPercentage < 40) {
                  badgeColor = 'bg-red-100 text-red-800 border-red-300';
                  levelText = 'Qiyin';
                } else if (stat.correctPercentage <= 75) {
                  badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                  levelText = "O'rtacha";
                }

                return (
                  <div
                    key={stat.question.id}
                    className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500">
                          {stat.number}-savol ({stat.question.points} ball)
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                          {levelText} ({stat.correctPercentage}%)
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-gray-900 mb-3 whitespace-pre-line">
                        {stat.question.text}
                      </p>

                      <div className="space-y-1 mb-4">
                        {stat.question.options.map(opt => {
                          const isCorrect = opt.id === stat.question.correctAnswer;
                          return (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-xl text-xs flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                                  : 'bg-gray-50 text-gray-700 border border-gray-100'
                              }`}
                            >
                              <span>{opt.id}) {opt.text}</span>
                              {isCorrect && (
                                <span className="text-[10px] text-emerald-700 font-bold">To'g'ri javob</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress Bar & metrics */}
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex justify-between text-xs text-gray-600 font-medium">
                        <span>To'g'ri javoblar: <strong className="text-emerald-600">{stat.correctCount}</strong> ta</span>
                        <span>Noto'g'ri: <strong className="text-red-600">{stat.incorrectCount}</strong> ta</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${stat.correctPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESET ATTEMPT CONFIRMATION */}
      {/* ========================================================= */}
      {resetConfirmResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">
              Urinishni bekor qilmoqchimisiz?
            </h4>
            <p className="text-xs text-gray-500 mb-4">
              <strong>{resetConfirmResult.studentFirstName} {resetConfirmResult.studentLastName}</strong>ning{' '}
              "{resetConfirmResult.testTitle}" testidagi natijasi o'chiriladi va o'quvchi testni qayta topshirish imkoniyatiga ega bo'ladi.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResetConfirmResult(null)}
                className="py-2.5 px-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition"
              >
                Ha, qayta o'rnatish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / RENAME GROUP */}
      {/* ========================================================= */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingGroupId ? "Guruhni tahrirlash" : "Yangi guruh yaratish"}
            </h3>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Guruh nomi
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: 10-A Matematika"
                  value={groupNameInput}
                  onChange={e => setGroupNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Guruh tavsifi (ixtiyoriy)
                </label>
                <textarea
                  rows={2}
                  placeholder="Guruh haqida qisqacha ma'lumot"
                  value={groupDescInput}
                  onChange={e => setGroupDescInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD STUDENT TO GROUP */}
      {/* ========================================================= */}
      {showAddStudentToGroupModal && selectedGroupForMembers && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              "{selectedGroupForMembers.name}"ga o'quvchi qo'shish
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Mavjud o'quvchilar ro'yxatidan tanlang:
            </p>

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 mb-4">
              {students
                .filter(s => !s.groupIds?.includes(selectedGroupForMembers.id))
                .map(std => (
                  <div key={std.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-900">{std.firstName} {std.lastName}</div>
                      <div className="text-[11px] text-gray-500">{std.phone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        dbService.addStudentToGroup(std.id, selectedGroupForMembers.id);
                        refresh();
                      }}
                      className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold border border-blue-200 transition"
                    >
                      + Qo'shish
                    </button>
                  </div>
                ))}
              {students.filter(s => !s.groupIds?.includes(selectedGroupForMembers.id)).length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400">
                  Barcha o'quvchilar ushbu guruhga qo'shilgan.
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddStudentToGroupModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: COMPREHENSIVE TEST CREATION & QUESTIONS BUILDER */}
      {/* ========================================================= */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-auto max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {editingTestId ? "Testni tahrirlash" : "Yangi test yaratish"}
                </h3>
                <p className="text-xs text-gray-500">
                  Savollar soni: <strong>{currentQuestions.length} ta</strong>
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-200/80 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTestEditorSubTab('settings')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    testEditorSubTab === 'settings' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  1. Sozlamalar
                </button>
                <button
                  type="button"
                  onClick={() => setTestEditorSubTab('questions')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    testEditorSubTab === 'questions' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  2. Savollar ({currentQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTestEditorSubTab('import')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    testEditorSubTab === 'import' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  3. Matn / DOCX yuklash
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* SUBTAB 1: TEST SETTINGS */}
              {testEditorSubTab === 'settings' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Test nomi *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Masalan: 10-sinf Fizika nazorat ishi"
                        value={testTitle}
                        onChange={e => setTestTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Biriktirilgan guruh
                      </label>
                      <select
                        value={assignedGroupId}
                        onChange={e => setAssignedGroupId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="all">Barcha guruhlar (Ochiq test)</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Tavsif (ixtiyoriy)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Test haqida yo'riqnoma yoki eslatmalar"
                      value={testDescription}
                      onChange={e => setTestDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Vaqt chegarasi (daqiqada)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 = cheklovsiz"
                        value={timeLimitMinutes}
                        onChange={e => setTimeLimitMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                      />
                      <span className="text-[10px] text-gray-400">0 kiritilsa cheklovsiz bo'ladi</span>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Ruxsat etilgan urinishlar soni
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 = cheksiz"
                        value={allowedAttempts}
                        onChange={e => setAllowedAttempts(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                      />
                      <span className="text-[10px] text-gray-400">0 kiritilsa cheksiz bo'ladi</span>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        O'tish foizi (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={passingPercentage}
                        onChange={e => setPassingPercentage(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Boshlanish vaqti (ixtiyoriy)
                      </label>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Tugash muddati (ixtiyoriy)
                      </label>
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={shuffleQuestions}
                        onChange={e => setShuffleQuestions(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Savollarni aralashtirish</div>
                        <div className="text-[11px] text-gray-500">Har bir o'quvchiga savollar tasodifiy tartibda chiqadi</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={shuffleOptions}
                        onChange={e => setShuffleOptions(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Variantlarni aralashtirish</div>
                        <div className="text-[11px] text-gray-500">Javob variantlari joylashuvi aralashadi</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={showCorrectAnswers}
                        onChange={e => setShowCorrectAnswers(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Testdan so'ng to'g'ri javoblarni ko'rsatish</div>
                        <div className="text-[11px] text-gray-500">O'quvchi xatolarini tahlil qilishi mumkin</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={showExplanations}
                        onChange={e => setShowExplanations(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <div>
                        <div className="font-bold text-gray-900">Testdan so'ng izohlarni ko'rsatish</div>
                        <div className="text-[11px] text-gray-500">Savol tagidagi tushuntirish beriladi</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: QUESTIONS LIST & MANUAL BUILDER */}
              {testEditorSubTab === 'questions' && (
                <div className="space-y-6">
                  {/* Current Questions in this Test */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-3">
                      Ushbu testdagi savollar ({currentQuestions.length} ta)
                    </h4>

                    {currentQuestions.length === 0 ? (
                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 text-center text-xs text-gray-500">
                        Testda hali savollar mavjud emas. Quyidagi forma orqali qo'shing yoki "3. Matn / DOCX yuklash" bo'limidan nusxalab kiriting.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentQuestions.map((q, idx) => (
                          <div key={q.id} className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 text-xs">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-bold text-gray-700">
                                {idx + 1}-savol ({q.points} ball) • {q.type === 'boolean' ? 'Rost/Yolg\'on' : 'Yagona to\'g\'ri javob'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCurrentQuestions(prev => prev.filter((_, i) => i !== idx))}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Savolni o'chirish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <p className="font-semibold text-gray-900 mb-2">{q.text}</p>

                            <div className="grid grid-cols-2 gap-1.5">
                              {q.options.map(opt => {
                                const isCorrect = opt.id === q.correctAnswer;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-1.5 px-2.5 rounded-lg border flex items-center justify-between ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                        : 'bg-white border-gray-200 text-gray-700'
                                    }`}
                                  >
                                    <span>{opt.id}) {opt.text}</span>
                                    {isCorrect && (
                                      <span className="text-[10px] text-emerald-700">✓ To'g'ri</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {q.explanation && (
                              <div className="mt-2 text-gray-500 italic text-[11px]">
                                Izoh: {q.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual Question Builder Form */}
                  <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-200 space-y-4">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Yangi savol qo'shish (Qo'lda kiritish)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Savol turi
                        </label>
                        <select
                          value={manualQuestionType}
                          onChange={e => setManualQuestionType(e.target.value as any)}
                          className="w-full p-2 text-xs border border-gray-300 rounded-xl bg-white"
                        >
                          <option value="single">Yagona to'g'ri javob (A, B, C, D)</option>
                          <option value="boolean">Rost / Yolg'on (True / False)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Ball miqdori
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={manualPoints}
                          onChange={e => setManualPoints(Number(e.target.value))}
                          className="w-full p-2 text-xs border border-gray-300 rounded-xl bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Savol matni *
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Savolni kiriting..."
                        value={manualQuestionText}
                        onChange={e => setManualQuestionText(e.target.value)}
                        className="w-full p-2.5 text-xs border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {manualQuestionType === 'single' ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-700">
                          Variantlar va to'g'ri javobni belgilang:
                        </label>
                        {manualOptions.map(opt => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="manual_correct"
                              checked={manualCorrectAnswer === opt.id}
                              onChange={() => setManualCorrectAnswer(opt.id)}
                              className="w-4 h-4 text-blue-600"
                              title="To'g'ri javob sifatida belgilash"
                            />
                            <span className="w-6 font-bold text-xs text-gray-600">{opt.id})</span>
                            <input
                              type="text"
                              placeholder={`Variant ${opt.id} matni`}
                              value={opt.text}
                              onChange={e => {
                                const newOpts = manualOptions.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o);
                                setManualOptions(newOpts);
                              }}
                              className="flex-1 p-2 text-xs border border-gray-300 rounded-xl bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-700">
                          To'g'ri javobni tanlang:
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                            <input
                              type="radio"
                              name="bool_correct"
                              checked={manualCorrectAnswer === 'A'}
                              onChange={() => setManualCorrectAnswer('A')}
                              className="w-4 h-4 text-blue-600"
                            />
                            A) Rost (To'g'ri)
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                            <input
                              type="radio"
                              name="bool_correct"
                              checked={manualCorrectAnswer === 'B'}
                              onChange={() => setManualCorrectAnswer('B')}
                              className="w-4 h-4 text-blue-600"
                            />
                            B) Yolg'on (Noto'g'ri)
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Izoh / Tushuntirish (ixtiyoriy)
                      </label>
                      <input
                        type="text"
                        placeholder="Nima uchun ushbu javob to'g'ri ekanligi tushuntirilishi"
                        value={manualExplanation}
                        onChange={e => setManualExplanation(e.target.value)}
                        className="w-full p-2 text-xs border border-gray-300 rounded-xl bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddManualQuestion}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Savolni testga qo'shish
                    </button>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: TEXT & DOCX IMPORT WITH ERROR PREVIEW */}
              {testEditorSubTab === 'import' && (
                <div className="space-y-5">
                  <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-blue-950">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      Savollar formati namunasi:
                    </div>
                    <pre className="bg-white/80 p-2.5 rounded-xl border border-blue-100 font-mono text-[11px] text-gray-800 mt-2">
{`1. O'zbekiston poytaxti qaysi shahar?
A) Samarqand
*B) Toshkent
C) Buxoro
D) Xiva
Izoh: Toshkent shahri mamlakat poytaxti hisoblanadi.`}
                    </pre>
                    <p className="text-[11px] text-blue-700 mt-1">
                      To'g'ri variant oldiga yulduzcha <strong>*</strong> qo'ying (masalan: <strong>*B) Toshkent</strong>).
                    </p>
                  </div>

                  {/* Input options: Paste or Upload DOCX */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs font-bold text-gray-700">Matnni joylashtiring yoki fayl yuklang:</span>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".docx"
                        onChange={handleDocxUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={docxLoading}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-gray-300 transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {docxLoading ? "Yuklanmoqda..." : ".DOCX fayl yuklash"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    placeholder="Savollarni shu yerga joylashtiring..."
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    className="w-full p-3 font-mono text-xs border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleParseText}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      Savollarni tahlil qilish (Tekshirish)
                    </button>

                    {parsedPreviewItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleApplyImportedQuestions}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Savollarni testga biriktirish ({parsedPreviewItems.filter(p => p.isValid).length} ta)
                      </button>
                    )}
                  </div>

                  {/* PREVIEW SCREEN WITH ERROR DIAGNOSTICS */}
                  {parsedPreviewItems.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900">
                          Tahlil natijasi (Ko'rib chiqish): {parsedPreviewItems.length} ta savol topildi
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-700 font-bold">
                            ✓ {parsedPreviewItems.filter(p => p.isValid).length} ta to'g'ri
                          </span>
                          {parsedPreviewItems.filter(p => !p.isValid).length > 0 && (
                            <span className="text-red-700 font-bold">
                              ⚠ {parsedPreviewItems.filter(p => !p.isValid).length} ta xato
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {parsedPreviewItems.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border text-xs ${
                              item.isValid
                                ? 'bg-white border-gray-200 shadow-xs'
                                : 'bg-red-50/50 border-red-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-gray-800">
                                {item.number}-savol
                              </span>
                              {item.isValid ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> To'g'ri format
                                </span>
                              ) : (
                                <span className="text-red-700 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Xatolik aniqlandi
                                </span>
                              )}
                            </div>

                            {/* Error warnings */}
                            {item.errors.length > 0 && (
                              <div className="mb-2 p-2 bg-red-100 text-red-800 rounded-xl text-xs space-y-1">
                                {item.errors.map((err, eIdx) => (
                                  <div key={eIdx}>• {err.message}</div>
                                ))}
                              </div>
                            )}

                            {/* Live editable preview */}
                            <div className="space-y-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Savol matni:</label>
                                <input
                                  type="text"
                                  value={item.question.text}
                                  onChange={e => {
                                    const updated = [...parsedPreviewItems];
                                    updated[idx].question.text = e.target.value;
                                    updated[idx].isValid = updated[idx].errors.length === 0 && !!e.target.value.trim();
                                    setParsedPreviewItems(updated);
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded-xl font-medium"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {item.question.options.map(opt => {
                                  const isCorrect = opt.id === item.question.correctAnswer;
                                  return (
                                    <div
                                      key={opt.id}
                                      onClick={() => {
                                        const updated = [...parsedPreviewItems];
                                        updated[idx].question.correctAnswer = opt.id;
                                        // clear error if it was missing correct answer
                                        updated[idx].errors = updated[idx].errors.filter(e => e.type !== 'no_correct_answer');
                                        updated[idx].isValid = updated[idx].errors.length === 0;
                                        setParsedPreviewItems(updated);
                                      }}
                                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                        isCorrect
                                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                      }`}
                                      title="To'g'ri javob qilish uchun bosing"
                                    >
                                      <span>{opt.id}) {opt.text}</span>
                                      <span className="text-[10px] text-gray-400">
                                        {isCorrect ? "✓ To'g'ri" : "Tanlash"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                Bekor qilish
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveTest}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Testni saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
