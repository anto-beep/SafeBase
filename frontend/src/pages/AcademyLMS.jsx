import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, Clock, CheckCircle, Play, Certificate } from "@phosphor-icons/react";
import { toast } from "sonner";

function CourseCard({ course, enrolment, onEnrol, onOpen }) {
  return (
    <div className="border border-border bg-background p-5 flex flex-col" data-testid={`academy-course-${course.course_id}`}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 bg-warning flex items-center justify-center"><GraduationCap weight="duotone" size={20} /></div>
        {enrolment?.status === "completed" && <span className="bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest">COMPLETED</span>}
        {enrolment && enrolment.status !== "completed" && <span className="bg-warning text-ink px-2 py-0.5 text-[10px] font-bold tracking-widest">{enrolment.progress_pct}%</span>}
      </div>
      <div className="font-display text-lg font-black tracking-tight mt-4">{course.title}</div>
      <p className="text-sm text-muted-foreground mt-2 flex-1">{course.description}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
        <span className="flex items-center gap-1"><Clock size={14} />{course.duration_mins} min</span>
        <span>•</span>
        <span>{course.modules} modules</span>
      </div>
      {enrolment ? (
        <Button onClick={() => onOpen(course, enrolment)} className="btn-sharp mt-4 bg-ink text-white hover:bg-authority" data-testid={`academy-open-${course.course_id}`}>
          <Play className="mr-2" weight="fill" />{enrolment.status === "completed" ? "View certificate" : "Continue"}
        </Button>
      ) : (
        <Button onClick={() => onEnrol(course)} className="btn-sharp mt-4 bg-warning text-ink hover:bg-warning/90" data-testid={`academy-enrol-${course.course_id}`}>
          Enrol for free
        </Button>
      )}
    </div>
  );
}

export default function Academy() {
  const [courses, setCourses] = useState([]);
  const [enrolments, setEnrolments] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const [c, e] = await Promise.all([api.get("/academy/courses"), api.get("/academy/enrolments")]);
    setCourses(c.data);
    setEnrolments(e.data);
  };
  useEffect(() => { load(); }, []);

  const enrolMap = enrolments.reduce((m, e) => ({ ...m, [e.course_id]: e }), {});

  const enrol = async (course) => {
    await api.post("/academy/enrolments", { course_id: course.course_id });
    toast.success(`Enrolled in ${course.title}`);
    load();
  };

  const open = (course, enrolment) => setSelected({ course, enrolment });

  const markModule = async (n) => {
    if (!selected) return;
    const r = await api.post(`/academy/enrolments/${selected.enrolment.enrolment_id}/progress`, { modules_completed: n });
    setSelected({ ...selected, enrolment: r.data });
    load();
    if (r.data.status === "completed") toast.success("🎓 Course complete — certificate issued");
  };

  return (
    <div className="space-y-6" data-testid="academy-page">
      <div className="border-b border-border pb-6">
        <div className="label-eyebrow">/ Academy</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-1">SafeBase Academy.</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">On-demand WHS training for you and your crew. Short, practical, Australian. Certificates on completion — stored on the worker's profile forever.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <CourseCard key={c.course_id} course={c} enrolment={enrolMap[c.course_id]} onEnrol={enrol} onOpen={open} />
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="rounded-none max-w-2xl border-ink max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight">{selected?.course?.title}</DialogTitle>
            <DialogDescription>{selected?.course?.description}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-muted p-4">
                <div className="flex justify-between text-sm mb-2"><span className="label-eyebrow">Progress</span><span className="font-bold">{selected.enrolment.progress_pct}% · {selected.enrolment.modules_completed}/{selected.enrolment.modules_total}</span></div>
                <div className="w-full bg-background h-2"><div className="bg-ink h-2" style={{ width: `${selected.enrolment.progress_pct}%` }} /></div>
              </div>

              <div className="space-y-2">
                {selected.course.topics.map((t, i) => {
                  const done = i < selected.enrolment.modules_completed;
                  return (
                    <button key={i} onClick={() => markModule(i + 1)} className={`w-full text-left flex items-center gap-3 px-3 py-3 border ${done ? "bg-emerald-50 border-emerald-200" : "border-border hover:bg-muted"}`} data-testid={`academy-module-${i}`}>
                      {done ? <CheckCircle weight="fill" className="text-emerald-600" /> : <Play size={16} />}
                      <span className="flex-1 text-sm">{i + 1}. {t}</span>
                      {done && <span className="label-eyebrow text-emerald-600">DONE</span>}
                    </button>
                  );
                })}
              </div>

              {selected.enrolment.status === "completed" && (
                <div className="border-2 border-warning bg-ink text-white p-6 text-center">
                  <Certificate size={36} weight="duotone" className="mx-auto text-warning" />
                  <div className="label-eyebrow text-warning mt-3">/ Certificate of completion</div>
                  <div className="font-display text-2xl font-black mt-1">{selected.course.title}</div>
                  <div className="text-xs text-white/60 mt-1">Certificate ID: <span className="font-mono">{selected.enrolment.certificate_id}</span></div>
                  <div className="text-xs text-white/60 mt-1">Issued {new Date(selected.enrolment.completed_at).toLocaleDateString("en-AU")}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
