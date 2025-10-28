import AuthCard from "../components/AuthCard";
import Logo from "../components/Logo";
import FeatureItem from "../components/FeatureItem";
import RegisterForm from "../components/RegisterForm";
import CreateAccountForm from "../components/CreateAccountForm";




export default function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="mx-auto max-w-6xl px-6 py-14 grid lg:grid-cols-2 gap-10">
        {/* Left side (نفس ستايل اللوجين لكن باستخدام FeatureItem) */}
        <section className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-slate-600 bg-white/60 backdrop-blur-sm">
            <Logo />
          </div>

          <h1 className="mt-6 text-4xl font-bold text-slate-900 leading-tight">
            Create your customer account
          </h1>

          <p className="mt-4 text-slate-600 max-w-lg">
            Join the POS platform to track your orders and enjoy faster checkout. It's quick and secure.
          </p>

          <div className="mt-6 space-y-3 text-slate-700">
            <FeatureItem icon="●" text="Simple, customer-only registration" />
            <FeatureItem icon="●" text="Secure password and privacy" />
            <FeatureItem icon="●" text="Works across store locations" />
          </div>
        </section>

        {/* Right side (AuthCard + RegisterForm) */}
        <section className="lg:max-w-md lg:ml-auto">
          <AuthCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">C</div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Create account</h2>
                <p className="text-sm text-slate-500">Customer registration</p>
              </div>
            </div>

            <RegisterForm />

            <div className="mt-6 text-center text-sm text-slate-600">
              Already have an account?
              <a href="/login" className="font-medium text-indigo-600 hover:underline ml-1">Sign in</a>
            </div>
          </AuthCard>

          <p className="mt-6 text-center text-xs text-slate-500">
            By creating an account, you agree to our Terms & Privacy.
          </p>
          <p className="mt-3 text-center text-xs text-slate-400">© 2025 POS · All rights reserved</p>
        </section>
      </div>
    </div>
  );
}

// Alternative: Customer register using CreateAccountForm
export function RegisterWithCreateAccountForm() {
  const handleSubmit = async (data: any) => {
    // This will be connected to your API
    console.log("Creating customer account:", data);
    alert("Customer account created successfully");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="mx-auto max-w-6xl px-6 py-14 grid lg:grid-cols-2 gap-10">
        {/* Left side */}
        <section className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-slate-600 bg-white/60 backdrop-blur-sm">
            <Logo />
          </div>

          <h1 className="mt-6 text-4xl font-bold text-slate-900 leading-tight">
            Create your customer account
          </h1>

          <p className="mt-4 text-slate-600 max-w-lg">
            Join the POS platform to track your orders and enjoy faster checkout. It's quick and secure.
          </p>

          <div className="mt-6 space-y-3 text-slate-700">
            <FeatureItem icon="✓" text="Simple, customer-only registration" />
            <FeatureItem icon="✓" text="Secure password and privacy" />
            <FeatureItem icon="✓" text="Works across store locations" />
          </div>
        </section>

        {/* Right side */}
        <section className="lg:max-w-md lg:ml-auto">
          <AuthCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">C</div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Create account</h2>
                <p className="text-sm text-slate-500">Customer registration</p>
              </div>
            </div>

            <CreateAccountForm 
              allowedRoles={['CUSTOMER']}
              onSubmit={handleSubmit}
            />

            <div className="mt-6 text-center text-sm text-slate-600">
              Already have an account?
              <a href="/login" className="font-medium text-indigo-600 hover:underline ml-1">Sign in</a>
            </div>
          </AuthCard>

          <p className="mt-6 text-center text-xs text-slate-500">
            By creating an account, you agree to our Terms & Privacy.
          </p>
          <p className="mt-3 text-center text-xs text-slate-400">© 2025 POS · All rights reserved</p>
        </section>
      </div>
    </div>
  );
}
