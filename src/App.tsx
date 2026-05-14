/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { 
  Stethoscope, 
  Eye, 
  Hand, 
  ClipboardCheck, 
  AlertCircle, 
  ChevronRight, 
  MessageSquare, 
  Send, 
  Loader2,
  CheckCircle2,
  Activity,
  ArrowRight,
  User,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

// --- Types ---
interface ContentSection {
  id: string;
  title: string;
  icon: any;
  items: {
    label: string;
    description: string;
    details?: string[];
  }[];
}

interface Question {
  id: string;
  text: string;
  correctAnswer: boolean;
  type: string; // 'inspection' | 'palpation'
}

interface CaseScenario {
  id: string;
  patientName: string;
  age: number;
  gender: 'M' | 'F';
  complaint: string;
  history: string;
  observationHint: string; // 시각적 단서
  palpationHint: string;   // 촉각적 단서
  questions: Question[];
  diagnosis: string;
}

const EXAMINATION_DATA: ContentSection[] = [
  {
    id: "inspection",
    title: "시진 (Inspection)",
    icon: Eye,
    items: [
      {
        label: "위치 (Location)",
        description: "궤양이 발생한 정확한 해부학적 위치를 파악합니다.",
        details: ["해부학적 용어 사용", "골돌출부(Bony prominence) 여부 확인"]
      },
      {
        label: "크기 (Size)",
        description: "가장 긴 길이, 수직 폭, 깊이를 측정합니다.",
        details: ["길이 x 폭 x 깊이 (cm)", "잠식(Undermining) 또는 누관(Sinus tract) 여부"]
      },
      {
        label: "경계 (Edge/Margin)",
        description: "궤양 가장자리의 모양을 관찰합니다.",
        details: ["경사진(Sloping): 정맥성 궤양", "펀치로 뚫은 듯한(Punched-out): 동맥성 궤양", "말려 들어간(Rolled): 기저세포암 의심", "들뜬(Undermined): 압박궤양"]
      },
      {
        label: "기저부 (Ulcer Base)",
        description: "바닥 조직의 상태를 확인합니다.",
        details: ["육아조직(Granulation): 붉고 건강함", "괴사조직(Slough/Necrosis): 노랗거나 검은 조직", "노출된 근막, 근육, 뼈 확인"]
      },
      {
        label: "삼출물 (Exudate)",
        description: "진물의 양과 성질을 관찰합니다.",
        details: ["장액성, 혈성, 화농성", "냄새(Odour) 여부"]
      }
    ]
  },
  {
    id: "palpation",
    title: "촉진 (Palpation)",
    icon: Hand,
    items: [
      {
        label: "말초 맥박 (Pulses)",
        description: "동맥부전 여부를 확인하기 위해 맥박을 확인합니다.",
        details: ["족배동맥(Dorsalis pedis)", "후경골동맥(Posterior tibial)"]
      },
      {
        label: "국소 온도 (Temperature)",
        description: "주변 피부와 비교하여 온도를 측정합니다.",
        details: ["열감: 감염 의심", "냉감: 혈류 저하 의심"]
      },
      {
        label: "압통 및 부종 (Tenderness/Edema)",
        description: "통증 부위와 함요부종 여부를 확인합니다.",
        details: ["함요부종(Pitting edema): 정맥 부전 또는 심부전", "심한 압통: 감염 또는 허혈"]
      }
    ]
  },
  {
    id: "measure",
    title: "MEASURE 기록법",
    icon: ClipboardCheck,
    items: [
      { label: "M (Measure)", description: "길이, 폭, 깊이 측정" },
      { label: "E (Exudate)", description: "삼출물의 양과 성질" },
      { label: "A (Appearance)", description: "궤양 기저부의 모양" },
      { label: "S (Suffering)", description: "환자가 느끼는 통증 수준" },
      { label: "U (Undermining)", description: "가장자리 잠식 여부" },
      { label: "R (Re-evaluate)", description: "주기적인 재확인" },
      { label: "E (Edge)", description: "피부 가장자리 상태" }
    ]
  }
];

// --- Components ---

function Header({ mode, setMode }: { mode: 'guide' | 'practice', setMode: (m: 'guide' | 'practice') => void }) {
  return (
    <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
          피부궤양 검진 시뮬레이터
        </h1>
        <p className="text-slate-500 mt-1 font-medium font-sans">
          Physical Examination & Nursing Simulation for Students
        </p>
      </div>
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
        <button 
          onClick={() => setMode('guide')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'guide' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          학습 가이드
        </button>
        <button 
          onClick={() => setMode('practice')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'practice' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          실전 연습
        </button>
      </div>
    </header>
  );
}

function SectionCard({ section }: { section: ContentSection }) {
  const isMeasure = section.id === "measure";
  const isInspection = section.id === "inspection";
  
  if (isMeasure) {
    return (
      <div id={section.id} className="col-span-full md:col-span-12 lg:col-span-4 bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-xl min-h-[400px]">
        <div>
          <h3 className="text-2xl font-bold mb-6 text-blue-400 flex items-center gap-2">
            <ClipboardCheck size={24} />
            MEASURE 기록법
          </h3>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {section.items.map((item, idx) => (
              <div key={idx} className="text-center border border-slate-700 rounded-2xl p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors">
                <div className="text-[10px] opacity-60 uppercase mb-1 font-mono tracking-tighter">{item.label}</div>
                <div className="font-bold text-xs">{item.description.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-8 leading-relaxed italic border-t border-slate-800 pt-6">
          * MEASURE 기록법은 상처의 변화를 객관적으로 평가하기 위한 표준 도구입니다.
        </p>
      </div>
    );
  }

  return (
    <div 
      id={section.id}
      className={`bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col h-full ${
        isInspection ? "col-span-full md:col-span-12 lg:col-span-4" : "col-span-full md:col-span-6 lg:col-span-4"
      }`}
    >
      <div className={`w-12 h-12 ${isInspection ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'} rounded-2xl flex items-center justify-center mb-6 shadow-sm`}>
        <section.icon size={24} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-6">{section.title}</h3>
      <ul className="space-y-4 text-slate-600 text-sm flex-grow">
        {section.items.map((item, idx) => (
          <li key={idx} className="flex flex-col gap-1">
            <div className="flex items-center">
              <span className={`w-1.5 h-1.5 rounded-full ${isInspection ? 'bg-blue-500' : 'bg-indigo-500'} mr-2 shrink-0`} />
              <strong className="text-slate-800">{item.label}</strong>
            </div>
            <span className="pl-3.5 text-xs text-slate-500 leading-snug">{item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PracticeMode() {
  const [currentCase, setCurrentCase] = useState<CaseScenario | null>(null);
  const [step, setStep] = useState<'intro' | 'inspection' | 'palpation' | 'diagnosis' | 'feedback'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, boolean>>({});
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");

  const generateCase = async () => {
    setIsLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `피부궤양 환자 임상 시뮬레이션 케이스를 생성해줘. 간호학생 교육용이며, 매번 '완전히 다른 유형'의 환자와 상처 소견을 생성해야 해.
        
        [필수 요구사항]
        1. 환자 유형 다양화: 정맥성, 동맥성, 당뇨성, 압박 궤양(1~4단계), 혈관염성 궤양, 감염성 궤양 등 다양한 임상 상황군에서 무작위 선택. 주호소와 과거력을 매번 다르게 창작해.
        2. 생생한 묘사: observationHint와 palpationHint는 해당 환자의 상태를 아주 세밀하고 고유하게 표현해줘. (예: "상처 바닥이 마른 건포도처럼 검고 딱딱하며...", "발을 만졌을 때 얼음장같이 차갑고...")
        3. 맞춤형 질문: 질문(questions)은 예시를 그대로 쓰지 말고, 해당 케이스의 특정 소견(Hints)을 학생이 제대로 읽었는지 확인하는 방향으로 시진 4개, 촉진 4개를 새롭게 구성해.
        
        [JSON 응답 형식]
        {
          "patientName": "이름",
          "age": number (40~90 사이),
          "gender": "M" 또는 "F",
          "complaint": "주호소 (환자의 목소리 톤으로)",
          "history": "과거력, 기저질환, 발병 경정 등",
          "observationHint": "시각적 소견 상세 기술",
          "palpationHint": "촉각적 소견 상세 기술",
          "questions": [
            { "id": "q1", "text": "시진 질문 1", "correctAnswer": true/false, "type": "inspection" },
            { "id": "q2", "text": "시진 질문 2", "correctAnswer": true/false, "type": "inspection" },
            { "id": "q3", "text": "시진 질문 3", "correctAnswer": true/false, "type": "inspection" },
            { "id": "q4", "text": "시진 질문 4", "correctAnswer": true/false, "type": "inspection" },
            { "id": "q5", "text": "촉진 질문 1", "correctAnswer": true/false, "type": "palpation" },
            { "id": "q6", "text": "촉진 질문 2", "correctAnswer": true/false, "type": "palpation" },
            { "id": "q7", "text": "촉진 질문 3", "correctAnswer": true/false, "type": "palpation" },
            { "id": "q8", "text": "촉진 질문 4", "correctAnswer": true/false, "type": "palpation" }
          ],
          "diagnosis": "구체적인 임상 진단명"
        }
        
        반드시 JSON 형식으로만 응답하며, 질문의 정답은 반드시 제공한 소견 단서(Hints)와 완벽하게 일치해야 함.`,
        config: { responseMimeType: "application/json" }
      });

      const response = await model;
      const parsed = JSON.parse(response.text);
      setCurrentCase({ ...parsed, id: Date.now().toString() });
      setStep('intro');
      setStudentAnswers({});
      setSelectedDiagnosis("");
      setFeedback("");
    } catch (error) {
      console.error(error);
      alert("케이스를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const getFeedback = async () => {
    setIsLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey! });
      
      const prompt = `간호학생의 피부궤양 신체검진 시뮬레이션 결과에 대해 전문적인 임상 피드백을 제공해주세요.
      
      [환자 데이터]
      - 실제 케이스: ${JSON.stringify(currentCase)}
      - 학생의 Yes/No 응답: ${JSON.stringify(studentAnswers)}
      - 학생의 최종 진단: ${selectedDiagnosis}
      
      [피드백 구성 요청]
      1. 총평: 학생의 진단과 문항 답변 정확도를 종합하여 한 줄 요약.
      2. 문항별 상세 분석: 학생이 틀린 문항이 있다면 어떤 임상 소견을 놓쳤는지, 해당 소견이 왜 중요한지 설명.
      3. 감별 진단 포인트: 학생이 내린 진단과 실제 진단 사이의 결정적인 차이점(예: 맥박 유무, 통증의 양상 등) 설명.
      4. 학습 권장사항: 이 케이스와 관련하여 추가로 학습해야 할 간호 지식 추천.
      
      [중요] 별표(*)나 강조(bold)와 같은 마크다운 기호를 절대 사용하지 말고, 순수 텍스트로만 구조화하여 답변해주세요. 전문 용어를 사용하되 학생이 이해하기 쉽게 친절하게 작성해주세요. 한글로 답변하세요.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setFeedback(response.text);
      setStep('feedback');
    } catch (error) {
      setFeedback("피드백 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentCase && !isLoading) {
    return (
      <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-10 shadow-inner">
          <Stethoscope size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-4">실전 검진 시뮬레이션</h2>
        <p className="text-slate-500 mb-10 text-center max-w-md leading-relaxed">
          AI가 생성하는 가설과 질문에 "예/아니오"로 응답하며 검진 역량을 기르세요.
        </p>
        <button 
          onClick={generateCase}
          className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-2xl"
        >
          시작하기
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-200 shadow-sm">
        <Loader2 className="animate-spin text-blue-600 mb-6" size={48} />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Simulation Loading...</p>
      </div>
    );
  }

  const renderQuestions = (type: string) => {
    return currentCase?.questions.filter(q => q.type === type).map((q) => (
      <div key={q.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-slate-700 font-medium">{q.text}</span>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => setStudentAnswers({...studentAnswers, [q.id]: true})}
            className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${studentAnswers[q.id] === true ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-400'}`}
          >
            예 (Yes)
          </button>
          <button 
            onClick={() => setStudentAnswers({...studentAnswers, [q.id]: false})}
            className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${studentAnswers[q.id] === false ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white text-slate-400 border border-slate-200 hover:border-red-400'}`}
          >
            아니오 (No)
          </button>
        </div>
      </div>
    ));
  };

  return (
    <div className="col-span-full space-y-8">
      {/* Progress Bar */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
        {['intro', 'inspection', 'palpation', 'diagnosis', 'feedback'].map((s, i) => (
          <div key={s} className="flex items-center gap-3 shrink-0 mx-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-colors ${
              step === s ? 'bg-blue-600 text-white shadow-lg' : i < ['intro', 'inspection', 'palpation', 'diagnosis', 'feedback'].indexOf(step) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {i < ['intro', 'inspection', 'palpation', 'diagnosis', 'feedback'].indexOf(step) ? <CheckCircle2 size={20} /> : i + 1}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest hidden lg:block ${step === s ? 'text-slate-900' : 'text-slate-400'}`}>
              {s === 'intro' ? '상황' : s === 'inspection' ? '시진' : s === 'palpation' ? '촉진' : s === 'diagnosis' ? '진단' : '피드백'}
            </span>
          </div>
        ))}
      </div>

      <motion.div 
        key={step} 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] border border-slate-200 p-8 md:p-14 shadow-sm"
      >
        {step === 'intro' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-6 mb-12">
              <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center shrink-0">
                <User size={36} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900">{currentCase?.patientName} <span className="text-slate-400 font-medium ml-2">{currentCase?.age}세 / {currentCase?.gender === 'M' ? '남성' : '여성'}</span></h3>
                <p className="text-blue-600 font-bold text-sm mt-1">입원 환자 정보</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-4">Chief Complaint</h4>
                <p className="text-slate-800 text-xl font-medium italic">"{currentCase?.complaint}"</p>
              </div>
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-4">History</h4>
                <p className="text-slate-700 leading-relaxed">{currentCase?.history}</p>
              </div>
              <button 
                onClick={() => setStep('inspection')}
                className="w-full py-6 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl"
              >
                검진 시작 (시진) <ArrowRight className="inline ml-2" size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 'inspection' && (
          <div className="max-w-4xl mx-auto">
             <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                <Eye size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">시진 (Visual Inspection)</h3>
                <p className="text-slate-500 text-sm">상처 소견을 읽고 질문에 답하세요.</p>
              </div>
            </div>
            
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-10 flex gap-4">
              <div className="text-indigo-400 shrink-0"><Info /></div>
              <div className="text-indigo-800 text-sm leading-relaxed">
                <strong className="block mb-1">[관찰 소견]</strong>
                {currentCase?.observationHint}
              </div>
            </div>

            <div className="space-y-4">
              {renderQuestions('inspection')}
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setStep('intro')} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-bold">이전</button>
              <button 
                onClick={() => setStep('palpation')}
                disabled={currentCase?.questions.filter(q => q.type === 'inspection').some(q => studentAnswers[q.id] === undefined)}
                className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg disabled:bg-slate-200"
              >
                다음 (촉진 단계)
              </button>
            </div>
          </div>
        )}

        {step === 'palpation' && (
          <div className="max-w-4xl mx-auto">
             <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Hand size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">촉진 (Palpation)</h3>
                <p className="text-slate-500 text-sm">촉각적 정보를 읽고 질문에 답하세요.</p>
              </div>
            </div>
            
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-10 flex gap-4">
              <div className="text-indigo-400 shrink-0"><Info /></div>
              <div className="text-indigo-800 text-sm leading-relaxed">
                <strong className="block mb-1">[촉진 소견]</strong>
                {currentCase?.palpationHint}
              </div>
            </div>

            <div className="space-y-4">
              {renderQuestions('palpation')}
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setStep('inspection')} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-bold">이전</button>
              <button 
                onClick={() => setStep('diagnosis')}
                disabled={currentCase?.questions.filter(q => q.type === 'palpation').some(q => studentAnswers[q.id] === undefined)}
                className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg disabled:bg-slate-200"
              >
                진단 내리기
              </button>
            </div>
          </div>
        )}

        {step === 'diagnosis' && (
          <div className="max-w-4xl mx-auto text-center">
            <ClipboardCheck size={64} className="mx-auto text-emerald-500 mb-6" />
            <h3 className="text-3xl font-bold text-slate-900 mb-2">최종 감별 진단</h3>
            <p className="text-slate-500 mb-12">지금까지의 소견을 종합했을 때, 가장 유력한 진단은?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "정맥성 궤양", desc: "정맥 환류 장애로 인한 압력 상승 및 울혈" },
                { name: "동맥성 궤양", desc: "동맥 폐쇄로 인한 산소 및 영양 공급 부족" },
                { name: "당뇨성 궤양", desc: "신경병증 및 미세혈관 질환의 복합적 작용" },
                { name: "압력 궤양", desc: "지속적 압박으로 인한 모세혈관 혈류 차단" }
              ].map((diag) => (
                <button 
                  key={diag.name}
                  onClick={() => setSelectedDiagnosis(diag.name)}
                  className={`p-6 rounded-[2.5rem] border-2 text-left transition-all ${selectedDiagnosis === diag.name ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                >
                  <div className={`font-bold text-lg mb-1 ${selectedDiagnosis === diag.name ? 'text-emerald-700' : 'text-slate-700'}`}>{diag.name}</div>
                  <div className="text-xs text-slate-400 font-medium leading-relaxed">{diag.desc}</div>
                </button>
              ))}
            </div>

            <button 
              onClick={getFeedback}
              disabled={!selectedDiagnosis}
              className="w-full mt-12 py-6 bg-emerald-600 text-white rounded-3xl font-bold text-xl shadow-xl disabled:bg-slate-200 transition-all"
            >
              시뮬레이션 완료 및 피드백 확인
            </button>
          </div>
        )}

        {step === 'feedback' && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="grid md:grid-cols-2 gap-10">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-20 blur-3xl" />
                <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">Clinical Result</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">학생의 진단</span>
                    <span className={`font-bold ${selectedDiagnosis.includes(currentCase?.diagnosis.substring(0, 2) || '') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedDiagnosis}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                    <span className="text-slate-400">실제 진단 (Answer)</span>
                    <span className="text-2xl font-bold text-white">{currentCase?.diagnosis}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[3rem] p-10 flex flex-col justify-center">
                 <h4 className="text-slate-900 font-bold mb-6 flex items-center gap-2"><Activity size={20} className="text-blue-600" /> 문항 정답률</h4>
                 <div className="space-y-4">
                  {currentCase?.questions.map(q => (
                    <div key={q.id} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 truncate max-w-[200px]">{q.text}</span>
                      <span className={`font-bold ${studentAnswers[q.id] === q.correctAnswer ? 'text-emerald-500' : 'text-red-500'}`}>
                        {studentAnswers[q.id] === q.correctAnswer ? '정답' : '오답'}
                      </span>
                    </div>
                  ))}
                 </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[3rem] p-10 md:p-14 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><MessageSquare size={150} /></div>
              <h4 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><MessageSquare size={20} /></div>
                AI Clinical Feedback Report
              </h4>
              
              <div className="space-y-6">
                {feedback.replace(/\*/g, '').split('\n\n').map((para, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div className="text-slate-700 leading-loose whitespace-pre-wrap font-medium">
                      {para.trim()}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={generateCase}
                className="w-full mt-12 py-5 bg-slate-900 text-white rounded-3xl font-bold hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3"
              >
                <Activity size={20} /> 다른 케이스로 다시 연습하기
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function AIConsultant() {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMsg,
        config: {
          systemInstruction: "당신은 전문 상처관리 간호사 및 혈관외과 전문의입니다. 사용자의 질문에 전문적이고 친절하게 답변해주세요. 별표(*)와 같은 마크다운 강조 기호를 사용하지 말고 순수 텍스트로만 답변하세요. 한글로 답변하세요."
        }
      });
      setMessages(prev => [...prev, { role: 'ai', text: response.text || "답변을 생성할 수 없습니다." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "오류가 발생했습니다." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="col-span-full mt-12 bg-slate-900 rounded-[3rem] p-10 text-white overflow-hidden relative shadow-2xl">
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><MessageSquare size={300} /></div>
      <div className="relative z-10">
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center"><Activity size={32} /></div>
          <div><h2 className="text-3xl font-bold">1:1 Clinical Mentor</h2><p className="text-slate-400">실시간 질문 및 임상 상담</p></div>
        </div>
        <div ref={scrollRef} className="h-[400px] overflow-y-auto mb-10 space-y-6 pr-6 custom-scrollbar">
          {messages.length === 0 && <div className="h-full flex items-center justify-center text-slate-500 text-xl text-center">상처 관리나 감별 진단에 대해<br/>무엇이든 물어보세요!</div>}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-6 rounded-[2rem] ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
          {isLoading && <div className="flex justify-start"><div className="bg-slate-800 p-6 rounded-[2rem]"><Loader2 className="animate-spin text-blue-400" /></div></div>}
        </div>
        <div className="flex gap-4 p-2 bg-slate-800 rounded-[2.5rem] border border-slate-700">
          <input 
            type="text" placeholder="질문을 입력하세요..." className="flex-1 bg-transparent px-8 py-5 text-white focus:outline-none"
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-blue-600 px-10 rounded-[2rem]"><Send size={24} /></button>
        </div>
      </div>
    </section>
  );
}

function DiseaseGuide() {
  const diseases = [
    {
      type: "정맥성 궤양 (Venous Ulcer)",
      description: "정맥 판막의 부전으로 인해 다리에 혈액이 정체(Stasis)되어 발생하는 가장 흔한 하퇴부 궤양입니다.",
      causes: "정맥 고혈압, 판막 부전, 심부정맥 혈전증 후유증",
      features: [
        "주로 발목 부위(내측 복사뼈 부근)에 발생",
        "삼출물(진물)의 양이 많음",
        "상처 경계가 불규칙하며 얕은 깊이",
        "주변 피부가 갈색으로 변색(Lipodermatosclerosis)되거나 부종 동반"
      ],
      iconColor: "bg-blue-500"
    },
    {
      type: "동맥성 궤양 (Arterial Ulcer)",
      description: "동맥의 폐쇄나 협착으로 인해 조직에 충분한 산소와 영양분이 공급되지 않아 발생합니다.",
      causes: "동맥경화증, 당뇨병, 흡연, 고혈압",
      features: [
        "발가락 끝, 발꿈치, 외측 복사뼈 등 말단 부위에 발생",
        "경계가 뚜렷하고 펀치로 뚫은 듯한(Punched-out) 모양",
        "바닥 조직이 창백하고 육아조직이 거의 없음",
        "심한 통증(특히 야간에 다리를 들었을 때 악화)"
      ],
      iconColor: "bg-amber-500"
    },
    {
      type: "당뇨성 궤양 (Diabetic Ulcer)",
      description: "신경병증(감각 소실)과 미세혈관 질환이 복합적으로 작용하여 발생하는 궤양입니다.",
      causes: "만성 고혈당으로 인한 말초신경병증, 혈관 손상",
      features: [
        "발바닥의 체중 지지 부위(Metatarsal head 등)에 주로 발생",
        "상처 주변에 두꺼운 굳은살(Callus)이 형성됨",
        "신경증으로 인해 통증을 거의 느끼지 못함(무통성)",
        "감염 시 골수염으로 진행될 위험이 매우 높음"
      ],
      iconColor: "bg-emerald-500"
    },
    {
      type: "압력 궤양 (Pressure Ulcer/욕창)",
      description: "지속적인 압박으로 인해 모세혈관의 혈류가 차단되어 연조직이 괴사되는 상태입니다.",
      causes: "장시간의 고정된 자세, 마찰, 응전력(Shearing force)",
      features: [
        "천골(꼬리뼈), 전자(대퇴골), 뒤꿈치 등 골돌출부 위",
        "신체 압박이 가해지는 부위면 어디든 발생 가능",
        "초기에는 소실되지 않는 홍반으로 시작",
        "깊이에 따라 1~4단계 및 미분류 단계로 구분"
      ],
      iconColor: "bg-rose-500"
    }
  ];

  return (
    <section className="col-span-full my-20">
      <div className="flex items-center gap-4 mb-10">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Ulcer Knowledge Base</h2>
        <div className="h-px bg-slate-200 flex-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {diseases.map((d, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm hover:shadow-xl transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-3 h-10 ${d.iconColor} rounded-full`} />
              <h3 className="text-xl font-bold text-slate-900">{d.type}</h3>
            </div>
            <p className="text-slate-600 text-sm mb-8 leading-relaxed font-medium">
              {d.description}
            </p>
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">주요 원인</h4>
                <p className="text-xs text-slate-500">{d.causes}</p>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">임상적 특징</h4>
                <ul className="space-y-2">
                  {d.features.map((f, i) => (
                    <li key={i} className="text-xs text-slate-700 flex gap-2">
                      <span className="text-blue-500">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DifferentialDiagnosis() {
  const tableData = [
    { type: "정맥성 (Venous)", site: "발목 내측 (Gaiter area)", edge: "불규칙, 상처 얇음", pulses: "정상", pain: "경미", color: "text-blue-600 bg-blue-50 border-blue-100" },
    { type: "동맥성 (Arterial)", site: "발가락, 발꿈치, 외측", edge: "뚜렷함 (Punched-out)", pulses: "소실", pain: "심함", color: "text-amber-600 bg-amber-50 border-amber-100" },
    { type: "당뇨성 (Diabetic)", site: "발바닥, 압박 지점", edge: "각화증 (Callus) 동반", pulses: "다양함", pain: "소실", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  ];

  return (
    <section className="col-span-full my-20">
      <h2 className="text-3xl font-black text-slate-800 mb-10 tracking-tight italic">DIFFERENTIAL DIAGNOSIS</h2>
      <div className="overflow-hidden rounded-[3.5rem] border border-slate-200 bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-10 py-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Type</th>
                <th className="px-10 py-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Typical Site</th>
                <th className="px-10 py-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Characteristics</th>
                <th className="px-10 py-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Pulses</th>
                <th className="px-10 py-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Pain Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {tableData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-8"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${row.color}`}>{row.type}</span></td>
                  <td className="px-10 py-8 text-slate-900">{row.site}</td>
                  <td className="px-10 py-8 text-slate-500 italic text-sm">{row.edge}</td>
                  <td className="px-10 py-8 text-slate-600 text-xs">{row.pulses}</td>
                  <td className="px-10 py-8 text-slate-900 font-bold">{row.pain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FinalTips() {
  return (
    <div className="col-span-full grid lg:grid-cols-12 gap-8 my-20">
      <div className="col-span-full lg:col-span-8 bg-red-50 border border-red-100 rounded-[3.5rem] p-12 flex flex-col md:flex-row items-center shadow-lg">
        <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shrink-0 mb-6 md:mb-0 md:mr-12 shadow-xl shadow-red-200">
          <AlertCircle className="text-white" size={40} />
        </div>
        <div>
          <h4 className="text-red-900 font-black text-2xl mb-4 italic uppercase">Critical Red Flags</h4>
          <p className="text-red-700/80 text-lg leading-relaxed font-medium">
            악취를 동반한 대량의 농성 삼출물, 급격한 크기 확대, 주변부의 심한 홍조 및 열감은 즉각적인 외과적 중재가 필요한 <span className="underline decoration-red-400">응급 상황</span>일 수 있습니다.
          </p>
        </div>
      </div>
      <div className="col-span-full lg:col-span-4 bg-emerald-50 p-12 rounded-[3.5rem] border border-emerald-100 shadow-lg flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-8 text-emerald-700">
          <CheckCircle2 size={32} />
          <h3 className="text-2xl font-black italic">Pro-Tips</h3>
        </div>
        <ul className="space-y-6 text-sm font-bold text-emerald-900/80 uppercase tracking-widest leading-loose">
          {["양측 사지를 비교하십시오.", "전후의 양상을 모두 기록하십시오.", "맥박 소실 시 ABI 수치를 산출하십시오."].map((t, i) => (
            <li key={i} className="flex gap-4"><span className="text-emerald-400">#</span>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<'guide' | 'practice'>('guide');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
      <div className="max-w-[1500px] mx-auto p-8 md:p-16 font-sans">
        <Header mode={mode} setMode={setMode} />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch pt-4">
          {mode === 'guide' ? (
            <>
              <div className="col-span-full mb-10"><div className="p-10 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm"><p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-4">Protocol</p><p className="text-2xl text-slate-700 leading-tight font-medium italic underline decoration-blue-500/20 underline-offset-8">피부궤양의 정확한 검진은 올바른 치료 방향을 설정하는 핵심 단계입니다.</p></div></div>
              {EXAMINATION_DATA.map((section) => (
                <div key={section.id} className={section.id === 'measure' ? 'col-span-full md:col-span-12 lg:col-span-4' : section.id === 'inspection' ? 'col-span-full md:col-span-12 lg:col-span-4' : 'col-span-full md:col-span-6 lg:col-span-4'}>
                  <SectionCard section={section} />
                </div>
              ))}
              <DiseaseGuide />
              <DifferentialDiagnosis /><FinalTips /><AIConsultant />
            </>
          ) : (<PracticeMode />)}
        </div>
        <footer className="mt-32 flex justify-between items-center text-[11px] text-slate-300 font-mono tracking-[0.2em] uppercase border-t border-slate-100 pt-12 pb-20">
          <div>Ref: WHO Wound Care Guidelines v2.4 (2026)</div>
          <div className="flex gap-10"><span>© AIS-Nursing-Edu</span></div>
        </footer>
      </div>
    </div>
  );
}
