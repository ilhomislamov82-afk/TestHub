import { Question, QuestionOption, ParsedQuestionItem, QuestionParseError } from '../types';

/**
 * Parses raw text containing one or multiple questions into structured items with validation diagnostics.
 * Format expected:
 * 1. Savol matni?
 * A) variant
 * *B) to'g'ri variant
 * C) variant
 * D) variant
 * [Izoh: ...] (ixtiyoriy)
 */
export function parseQuestionsFromText(rawText: string): ParsedQuestionItem[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into question blocks:
  // Detect lines that start with a number followed by dot or bracket: e.g. "1.", "1)", "1 -", "Savol 1:"
  const lines = normalized.split('\n');
  const blocks: { number: number; lines: string[] }[] = [];
  let currentBlock: string[] = [];
  let currentNumber = 1;

  const questionHeaderRegex = /^\s*(?:savol\s+)?(\d+)[\.\)\:\-]\s*(.*)$/i;

  for (const line of lines) {
    const match = line.match(questionHeaderRegex);
    if (match) {
      if (currentBlock.length > 0) {
        blocks.push({ number: currentNumber, lines: [...currentBlock] });
        currentBlock = [];
      }
      currentNumber = parseInt(match[1], 10) || (blocks.length + 1);
      // Keep the rest of the line (or the whole line if the rest is empty)
      currentBlock.push(line);
    } else {
      // If block hasn't started yet and line has content, start block 1
      if (blocks.length === 0 && currentBlock.length === 0 && line.trim()) {
        currentBlock.push(line);
      } else if (currentBlock.length > 0 || line.trim()) {
        currentBlock.push(line);
      }
    }
  }

  if (currentBlock.length > 0) {
    blocks.push({ number: currentNumber, lines: [...currentBlock] });
  }

  // If no numbered headers were found, treat double-newlines as question separators
  if (blocks.length <= 1 && normalized.includes('\n\n')) {
    const paragraphBlocks = normalized.split(/\n\s*\n+/).filter(b => b.trim());
    if (paragraphBlocks.length > 1) {
      blocks.length = 0;
      paragraphBlocks.forEach((p, idx) => {
        blocks.push({
          number: idx + 1,
          lines: p.split('\n')
        });
      });
    }
  }

  return blocks.map((b, index) => parseSingleBlock(b.lines, b.number || index + 1));
}

function parseSingleBlock(rawLines: string[], blockNumber: number): ParsedQuestionItem {
  const fullRawText = rawLines.join('\n').trim();
  const errors: QuestionParseError[] = [];

  // Filter out empty lines
  const nonEmptyLines = rawLines.map(l => l.trim()).filter(Boolean);

  if (nonEmptyLines.length === 0) {
    return {
      number: blockNumber,
      rawText: fullRawText,
      question: {
        id: `q_${Date.now()}_${blockNumber}`,
        text: '',
        type: 'single',
        options: [],
        correctAnswer: '',
        points: 1,
      },
      errors: [{
        questionNumber: blockNumber,
        type: 'missing_question',
        message: `${blockNumber}-savol bo'sh qolgan`,
      }],
      isValid: false,
    };
  }

  // Parse lines: identify question text, options, and optional explanation
  let questionTextLines: string[] = [];
  const options: QuestionOption[] = [];
  let correctOptionId: string | null = null;
  let correctOptionCount = 0;
  let explanation: string | undefined = undefined;

  // Patterns for options:
  // e.g. "A) variant", "*A) to'g'ri", "+A) to'g'ri", "A. variant", "*A. variant", "A - variant"
  // or "A) *to'g'ri", "A) to'g'ri [to'g'ri]", "A) to'g'ri (to'g'ri)"
  const optionRegex = /^(\*|\+)?\s*([A-Za-z0-9])[\.\)\:\-]\s*(.*)$/;
  const explanationRegex = /^(?:izoh|tushuntirish|explanation)\s*[\:\-]\s*(.*)$/i;

  let inOptionsPhase = false;

  for (let i = 0; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i];

    // Check for explanation
    const explMatch = line.match(explanationRegex);
    if (explMatch) {
      explanation = explMatch[1].trim();
      continue;
    }

    const optMatch = line.match(optionRegex);
    if (optMatch) {
      inOptionsPhase = true;
      const leadingStar = !!optMatch[1];
      const optKey = optMatch[2].toUpperCase();
      let optText = optMatch[3].trim();

      // Check if text starts with an asterisk or ends with explicit tag: "*Variant" or "[to'g'ri]" or "(to'g'ri)"
      let isCorrect = leadingStar;
      if (optText.startsWith('*') || optText.startsWith('+')) {
        isCorrect = true;
        optText = optText.replace(/^[\*\+]\s*/, '');
      } else if (/\s*[\(\[]\s*(?:to['`’]g['`’]ri|correct|toqri)\s*[\)\]]$/i.test(optText)) {
        isCorrect = true;
        optText = optText.replace(/\s*[\(\[]\s*(?:to['`’]g['`’]ri|correct|toqri)\s*[\)\]]$/i, '');
      }

      options.push({
        id: optKey,
        text: optText,
      });

      if (isCorrect) {
        correctOptionId = optKey;
        correctOptionCount++;
      }
    } else if (inOptionsPhase) {
      // Could be continuation of previous option or explanation
      if (options.length > 0) {
        options[options.length - 1].text += ' ' + line;
      }
    } else {
      // Question text lines
      questionTextLines.push(line);
    }
  }

  // Clean question text header: remove leading "1.", "1)", "Savol 1:", etc.
  let questionText = questionTextLines.join(' ').trim();
  questionText = questionText.replace(/^\s*(?:savol\s+)?\d+[\.\)\:\-]\s*/i, '').trim();

  // Check for True / False pattern if options are Rost / Yolg'on
  const isBoolean = options.length === 2 &&
    options.some(o => /^(?:rost|ha|true)$/i.test(o.text)) &&
    options.some(o => /^(?:yolg['`’]on|yo['`’]q|false)$/i.test(o.text));

  // Validation
  if (!questionText) {
    errors.push({
      questionNumber: blockNumber,
      type: 'missing_question',
      message: 'Savol matni kiritilmagan',
    });
  }

  if (options.length < 2) {
    errors.push({
      questionNumber: blockNumber,
      type: 'missing_options',
      message: `Variantlar yetarli emas (kamida 2 ta bo'lishi kerak, hozirda ${options.length} ta)`,
    });
  }

  // Check if option texts are empty
  const emptyOptions = options.filter(o => !o.text.trim());
  if (emptyOptions.length > 0) {
    errors.push({
      questionNumber: blockNumber,
      type: 'invalid_format',
      message: `${emptyOptions.length} ta variant matnsiz qolgan`,
    });
  }

  if (correctOptionCount === 0) {
    errors.push({
      questionNumber: blockNumber,
      type: 'no_correct_answer',
      message: "To'g'ri javob belgilanmagan (* belgisi bilan belgilang, masalan: *B) variant)",
    });
  } else if (correctOptionCount > 1) {
    errors.push({
      questionNumber: blockNumber,
      type: 'multiple_correct_answers',
      message: `Bitta savolda birdan ortiq (${correctOptionCount} ta) to'g'ri javob belgilangan`,
    });
  }

  const generatedQuestion: Question = {
    id: `q_${Date.now()}_${blockNumber}_${Math.random().toString(36).substring(2, 6)}`,
    text: questionText,
    type: isBoolean ? 'boolean' : 'single',
    options,
    correctAnswer: correctOptionId || (options[0]?.id || ''),
    points: 1,
    explanation: explanation || '',
  };

  return {
    number: blockNumber,
    rawText: fullRawText,
    question: generatedQuestion,
    errors,
    isValid: errors.length === 0,
  };
}
