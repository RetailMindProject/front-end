import AuthCard from "../components/AuthCard";
import Logo from "../components/Logo";
import FeatureItem from "../components/FeatureItem";
import RegisterForm from "../components/RegisterForm";
import CreateAccountForm from "../components/CreateAccountForm";

export default function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-stretch">
      {/* Left - نفس فكرة صفحة اللوجين */}
      <div className="flex-1 p-8 flex flex-col">
        <div>
          <Logo />
        </div>

        <div className="mt-10 flex justify-center md:justify-start">
          <img
            src="/picture/retalmind%20(3).jpeg"
            alt="RetailMind"
            className="w-56 max-w-full rounded-lg shadow-sm filter brightness-95"
          />
        </div>

        <div className="mt-16 max-w-md">
          <h1 className="text-5xl font-extrabold mb-6 text-gray-800">
            Create your customer account
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            Join the POS platform to track your orders and enjoy faster
            checkout. It's quick and secure.
          </p>

          <div className="space-y-6">
            <FeatureItem icon="🔵" text="Simple, customer-only registration" />
            <FeatureItem icon="📦" text="Secure password and privacy" />
            <FeatureItem icon="🌍" text="Works across store locations" />
          </div>
        </div>

        <div className="mt-auto">
          <p className="text-sm text-gray-500">
            © 2025 POS - All rights reserved
          </p>
        </div>
      </div>

      {/* Right */}
      <AuthCard>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-[#0066FF] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Create account</h2>
            <p className="text-gray-500 text-sm">Customer registration</p>
          </div>
        </div>

        <RegisterForm />

        <div className="text-center text-sm">
          <span className="text-gray-500">Already have an account?</span>{" "}
          <a href="/login" className="text-[#0066FF] hover:underline">
            Sign in
          </a>
        </div>
      </AuthCard>
    </div>
  );
}

// اختياري: تبقي البديل كما هو
export function RegisterWithCreateAccountForm() {
  const handleSubmit = async (data: any) => {
    console.log("Creating customer account:", data);
    alert("Customer account created successfully");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-stretch">
      {/* Left */}
      <div className="flex-1 p-8 flex flex-col">
        <div>
          <Logo />
        </div>

        <div className="mt-10 flex justify-center md:justify-start">
          <img
            src="/picture/retalmind%20(3).jpeg"
            alt="RetailMind"
            className="w-56 max-w-full rounded-lg shadow-sm filter brightness-95"
          />
        </div>

        <div className="mt-16 max-w-md">
          <h1 className="text-5xl font-extrabold mb-6 text-gray-800">
            Create your customer account
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            Join the POS platform to track your orders and enjoy faster
            checkout. It's quick and secure.
          </p>

          <div className="space-y-6">
            <FeatureItem icon="🔵" text="Simple, customer-only registration" />
            <FeatureItem icon="📦" text="Secure password and privacy" />
            <FeatureItem icon="🌍" text="Works across store locations" />
          </div>
        </div>

        <div className="mt-auto">
          <p className="text-sm text-gray-500">
            © 2025 POS - All rights reserved
          </p>
        </div>
      </div>

      {/* Right */}
      <AuthCard>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-[#0066FF] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Create account</h2>
            <p className="text-gray-500 text-sm">Customer registration</p>
          </div>
        </div>

        <CreateAccountForm
          allowedRoles={["CUSTOMER"]}
          onSubmit={handleSubmit}
        />

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?
          <a href="/login" className="text-[#0066FF] hover:underline ml-1">
            Sign in
          </a>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By creating an account, you agree to our Terms & Privacy.
        </p>
      </AuthCard>
    </div>
  );
}
