"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle, Send, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/questions/${id}`);
        const data = await res.json();
        if (!cancelled && data.exam) {
          setExam(data.exam);
          if (data.exam.timeLimit) {
            setTimeLeft(data.exam.timeLimit * 60);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result || submitting) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timerId);
          handleSubmit(true); // auto submit
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, result, submitting]);

  async function handleSubmit(autoSubmit = false) {
    if (!exam) return;
    if (!autoSubmit && !confirm("Bạn có chắc chắn muốn nộp bài?")) return;
    
    setSubmitting(true);
    setError("");
    
    try {
      const res = await fetch(`/api/questions/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, mode: "exam" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi nộp bài");
      
      setResult(data.result); // { totalScore, maxScore, gradedQuestions }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function handleOptionChange(qId: string, value: string) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-indigo-600">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-800">Không tìm thấy đề thi</h1>
        <Link href="/learn" className="mt-4 text-indigo-600 font-semibold hover:underline">Về trang chủ</Link>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/learn" className="p-2 text-gray-500 hover:text-indigo-600 transition-colors bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <h1 className="text-lg font-bold text-gray-800 truncate flex-1 mx-4 text-center">{exam.title}</h1>

          {timeLeft !== null && !result && (
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg shadow-sm ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {error && (
           <div className="p-4 bg-red-100 text-red-800 rounded-xl font-semibold border border-red-200">{error}</div>
        )}

        {/* Result Summary */}
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl text-white shadow-xl text-center space-y-4">
            <h2 className="text-2xl font-bold">Kết Quả Làm Bài</h2>
            <div className="text-7xl font-black drop-shadow-md">
              {Math.round((result.totalScore / result.maxScore) * 100) / 10} <span className="text-3xl text-indigo-200">/ 10</span>
            </div>
            <p className="text-indigo-100 font-medium text-lg">Bạn đã hoàn thành đề thi!</p>
            {result.totalScore / result.maxScore >= 0.8 && <p className="text-yellow-300 font-bold text-xl">🎉 Tuyệt vời! 🎉</p>}
          </motion.div>
        )}

        {/* Questions List */}
        <div className="space-y-6">
          {exam.questions.map((q: any, i: number) => {
            const isEssay = q.type === "essay";
            const graded = result?.gradedQuestions?.find((g: any) => g.id === q.id);

            return (
              <div key={q.id} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border border-indigo-200">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium text-lg leading-relaxed whitespace-pre-wrap">{q.content}</p>
                    <div className="flex gap-2 mt-2">
                       <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500 rounded-md">
                          {q.difficulty === 'nhan_biet' ? 'Nhận biết' : q.difficulty === 'thong_hieu' ? 'Thông hiểu' : 'Vận dụng'}
                       </span>
                    </div>
                  </div>
                </div>

                {/* Answer Area */}
                <div className="pl-14">
                  {isEssay ? (
                    <textarea
                      disabled={!!result || submitting}
                      className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:bg-gray-100 disabled:text-gray-600"
                      placeholder="Nhập câu trả lời của bạn..."
                      value={answers[q.id] || ""}
                      onChange={(e) => handleOptionChange(q.id, e.target.value)}
                    />
                  ) : (
                    <div className="space-y-3">
                      {q.options.map((opt: string, optIdx: number) => {
                        const checked = answers[q.id] === String(optIdx);
                        let optionClass = `p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          checked ? "border-indigo-500 bg-indigo-50" : "border-gray-100 bg-white hover:border-indigo-200"
                        }`;
                        
                        // Override styles if graded
                        if (graded && q.type === "mcq") {
                           const isCorrectOption = String(optIdx) === graded.correctAnswer;
                           if (isCorrectOption) {
                              optionClass = "p-4 rounded-xl border-2 flex items-start gap-3 border-emerald-500 bg-emerald-50 text-emerald-900";
                           } else if (checked && !isCorrectOption) {
                              optionClass = "p-4 rounded-xl border-2 flex items-start gap-3 border-red-500 bg-red-50 text-red-900 opacity-60";
                           } else {
                              optionClass = "p-4 rounded-xl border-2 flex items-start gap-3 border-gray-100 bg-white opacity-40 cursor-not-allowed";
                           }
                        }

                        return (
                          <div key={optIdx} className={optionClass} onClick={() => !result && handleOptionChange(q.id, String(optIdx))}>
                            <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                               checked && !graded ? "border-indigo-500 bg-indigo-500" : 
                               graded && String(optIdx) === graded.correctAnswer ? "border-emerald-500 bg-emerald-500" :
                               graded && checked ? "border-red-500 bg-red-500" :
                               "border-gray-300"
                            }`}>
                               {(checked || (graded && String(optIdx) === graded.correctAnswer)) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                            </div>
                            <span className="font-medium text-[15px]">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Feedback (Grading result) */}
                  {graded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-3">
                      {isEssay && (
                        <div className={`p-4 rounded-xl border ${graded.score > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                           <h4 className="font-bold flex items-center gap-2 mb-2">
                             {graded.score > 0 ? <CheckCircle className="w-5 h-5 text-emerald-500"/> : <AlertTriangle className="w-5 h-5 text-amber-500"/>}
                             Điểm tự luận: {Math.round(graded.score * 100) / 100} / {q.scoreWeight}
                           </h4>
                           {graded.feedback && <p className="text-sm italic">{graded.feedback}</p>}
                        </div>
                      )}
                      
                      {graded.explanation && (
                         <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <h4 className="font-bold text-blue-900 mb-1">Giải thích:</h4>
                            <p className="text-sm text-blue-800">{graded.explanation}</p>
                         </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        {!result && (
          <div className="flex justify-center pt-8">
             <button
               onClick={() => handleSubmit(false)}
               disabled={submitting}
               className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center gap-3 transition-transform active:scale-95 text-lg"
             >
               {submitting ? (
                 <>
                   <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                   Đang nộp và chấm điểm...
                 </>
               ) : (
                 <>
                   <Send className="w-5 h-5" />
                   Nộp Bài
                 </>
               )}
             </button>
          </div>
        )}
      </main>
    </div>
  );
}
