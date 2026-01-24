import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, Save, X, ArrowLeft } from "lucide-react";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import ProfileInput from "../components/profile/ProfileInput";
import ProfileSection from "../components/profile/ProfileSection";
import ProfileBanner from "../components/profile/ProfileBanner";
import type { ProfileFormData } from "../components/profile/types";
import { getUserInfo, getCurrentRole, decodeJWT, getCurrentToken, setUserInfo } from "../services/tokens";
import { getCurrentUserProfile } from "../services/auth.api";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";

function useRoleAndName() {
  const userInfo = getUserInfo();
  const currentRole = getCurrentRole();
  const token = getCurrentToken();
  
  let firstName = "";
  let lastName = "";
  let email = "";
  let phone = "";
  let address = "";
  
  if (userInfo) {
    firstName = userInfo.firstName || "";
    lastName = userInfo.lastName || "";
    email = userInfo.email || "";
    phone = userInfo.phone || "";
    address = userInfo.address || "";
  }
  
  if (token) {
    const decoded = decodeJWT(token);
    if (decoded) {
      if (!firstName) firstName = decoded.firstName || decoded.first_name || decoded.firstName || "";
      if (!lastName) lastName = decoded.lastName || decoded.last_name || decoded.lastName || "";
      if (!email) email = decoded.email || decoded.sub || decoded.username || "";
      if (!phone) {
        phone = decoded.phone || decoded.phoneNumber || decoded.phone_number || 
                decoded.userPhone || decoded.user_phone || "";
      }
      if (!address) {
        address = decoded.address || decoded.userAddress || decoded.user_address || 
                  decoded.userAddress || decoded.user_address || "";
      }
    }
  }
  
  // Determine role and avatar
  let role = "Dashboard";
  let allowPhotoChange = false;
  let avatarImage: string | undefined = undefined;
  
  if (currentRole === "CEO" || userInfo?.role === "CEO") {
    role = "CEO";
    allowPhotoChange = true;
    avatarImage = "/picture/ceo.png";
  } else if (currentRole === "STORE_MANAGER" || userInfo?.role === "STORE_MANAGER") {
    role = "Store Manager";
    allowPhotoChange = false;
    avatarImage = "/picture/storemanager.png";
  } else if (currentRole === "INVENTORY_MANAGER" || userInfo?.role === "INVENTORY_MANAGER") {
    role = "Inventory Manager";
    allowPhotoChange = true;
    avatarImage = "/picture/inventorymanager.png";
  } else if (currentRole === "CASHIER" || userInfo?.role === "CASHIER") {
    role = "Cashier";
    allowPhotoChange = false;
    avatarImage = undefined;
  }
  
  return { 
    role, 
    name: `${firstName} ${lastName}`.trim() || email || "Guest",
    allowPhotoChange,
    avatarImage,
    initialData: {
      firstName,
      lastName,
      address: address || "Not provided",
      email,
      phone: phone || "Not provided",
    }
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const { initialData: defaultInitialData, allowPhotoChange, avatarImage } = useRoleAndName();
  const [form, setForm] = useState<ProfileFormData>(defaultInitialData);
  const [isEdited, setIsEdited] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get dashboard route based on role
  const getDashboardRoute = (): string => {
    const role = getCurrentRole();
    if (role) return "/dashboard";
    return "/login";
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      setLoading(true);
      const result = await getCurrentUserProfile();
      
      if (result.data) {
        const profileData: ProfileFormData = {
          firstName: result.data.firstName || "",
          lastName: result.data.lastName || "",
          email: result.data.email || "",
          phone: result.data.phone || "Not provided",
          address: result.data.address || "Not provided",
        };
        
        setForm(profileData);
        
        setUserInfo({
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email,
          phone: result.data.phone,
          address: result.data.address,
          role: result.data.role as any,
        });
      } else {
        setForm(defaultInitialData);
      }
      
      setLoading(false);
    };
    
    loadUserProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setIsEdited(true);
  };

  const handleSave = () => {
    console.log("Saving profile:", form);
    alert("Profile saved successfully!");
    setIsEdited(false);
  };

  const handleCancel = () => {
    setForm(defaultInitialData);
    setIsEdited(false);
  };

  const handlePhotoChange = allowPhotoChange
    ? () => {
        // في الواقع سيكون رفع صورة
        alert("Photo change functionality (Mock)");
      }
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          {getCurrentRole() === "CASHIER" ? (
            <button
              onClick={() => navigate("/cashier")}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 ease-in-out group overflow-hidden mb-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <ArrowLeft size={18} className="relative z-10 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="relative z-10 font-medium">Back to Terminal</span>
            </button>
          ) : (
            <button
              onClick={() => navigate(getDashboardRoute())}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 ease-in-out group overflow-hidden mb-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <ArrowLeft size={18} className="relative z-10 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="relative z-10 font-medium">Back to Dashboard</span>
            </button>
          )}
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Profile</h1>
          <p className="text-slate-600">Manage your personal information and account details</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Top Banner */}
          <ProfileBanner>
            <div className="absolute -bottom-16 left-8">
              <ProfileAvatar
                firstName={form.firstName}
                lastName={form.lastName}
                size={128}
                onPhotoChange={handlePhotoChange}
                avatarImage={avatarImage}
              />
            </div>
          </ProfileBanner>

          {/* Form Content */}
          <div className="pt-20 px-8 pb-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-slate-600">Loading profile...</span>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {form.firstName} {form.lastName}
                  </h2>
                  <p className="text-slate-500 flex items-center gap-2 mt-1">
                    <Mail size={16} />
                    {form.email}
                  </p>
                </div>

                <div className="space-y-6">
              {/* Personal Information */}
              <ProfileSection
                title="Personal Information"
                icon={<User size={20} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ProfileInput
                    label="First Name"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                  />
                  <ProfileInput
                    label="Last Name"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                  />
                </div>
              </ProfileSection>

              {/* Contact Information */}
              <ProfileSection
                title="Contact Information"
                icon={<Phone size={20} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ProfileInput
                    label="Email Address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    icon={<Mail size={18} />}
                  />
                  <ProfileInput
                    label="Phone Number"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="059-XXX-XXXX"
                    icon={<Phone size={18} />}
                  />
                </div>
              </ProfileSection>

              {/* Location */}
              <ProfileSection
                title="Location"
                icon={<MapPin size={20} />}
              >
                <ProfileInput
                  label="Address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  icon={<MapPin size={18} />}
                />
              </ProfileSection>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={!isEdited}
                    className="h-12 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isEdited}
                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


