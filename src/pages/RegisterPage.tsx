import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import FeatureItem from "../components/FeatureItem";
import RegisterForm from "../components/RegisterForm";
import CreateAccountForm from "../components/CreateAccountForm";

function RegisterShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Form first on mobile */}
          <div className="lg:order-2 lg:col-span-7">
            <div className="rounded-3xl bg-white/80 backdrop-blur shadow-xl ring-1 ring-slate-200/70 p-7 md:p-8">
              {children}
            </div>
          </div>

          {/* Compact brand panel */}
          <div className="lg:order-1 lg:col-span-5">
            <div className="rounded-3xl bg-white/60 backdrop-blur ring-1 ring-slate-200/70 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm ring-1 ring-blue-400/20 flex items-center justify-center overflow-hidden">
                  <img
                    src="/picture/retalmind%20(3).jpeg"
                    alt="RetailMind"
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                </div>
                <div>
                  <div className="text-base font-extrabold tracking-tight text-slate-900">RetailMind</div>
                  <div className="text-xs text-slate-500">Customer Portal</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-lg font-bold text-slate-900">Why create an account?</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Faster checkout, order tracking, and a secure experience—built to stay simple.
                </div>
              </div>

              <div className="mt-5 space-y-3.5">
                <FeatureItem icon={<Zap className="h-5 w-5" />} text="Faster checkout" />
                <FeatureItem icon={<CheckCircle2 className="h-5 w-5" />} text="Order tracking" />
                <FeatureItem icon={<ShieldCheck className="h-5 w-5" />} text="Secure account" />
              </div>

              <div className="mt-6 text-xs text-slate-500">
                © {new Date().getFullYear()} RetailMind POS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  return (
    <RegisterShell>
        <BackButton onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back
        </BackButton>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-blue-400/20">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Create account</h2>
            <p className="text-slate-500 text-sm mt-1">Customer registration</p>
          </div>
        </div>

        <RegisterForm />

        <div className="text-center text-sm">
          <span className="text-slate-500">Already have an account?</span>{" "}
          <Link to="/auth/login" className="text-blue-700 hover:underline font-semibold">
            Sign in
          </Link>
        </div>
    </RegisterShell>
  );
}

// اختياري: تبقي البديل كما هو
export function RegisterWithCreateAccountForm() {
  const handleSubmit = async (data: any) => {
    console.log("Creating customer account:", data);
    alert("Customer account created successfully");
  };
  const navigate = useNavigate();

  return (
    <RegisterShell>
        <BackButton onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back
        </BackButton>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-blue-400/20">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Create account</h2>
            <p className="text-slate-500 text-sm mt-1">Customer registration</p>
          </div>
        </div>

        <CreateAccountForm
          allowedRoles={["CUSTOMER"]}
          onSubmit={handleSubmit}
        />

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?
          <Link to="/auth/login" className="text-blue-700 hover:underline ml-1 font-semibold">
            Sign in
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By creating an account, you agree to our Terms & Privacy.
        </p>
    </RegisterShell>
  );
}
