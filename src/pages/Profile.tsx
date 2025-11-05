import { useState } from "react";
import { useLocation } from "react-router-dom";
import { User, Mail, Phone, MapPin, Save, X } from "lucide-react";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import ProfileInput from "../components/profile/ProfileInput";
import ProfileSection from "../components/profile/ProfileSection";
import ProfileBanner from "../components/profile/ProfileBanner";
import type { ProfileFormData } from "../components/profile/types";

function useRoleAndName() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/ceo")) {
    return { 
      role: "CEO", 
      name: "Ahmad Ali",
      allowPhotoChange: true,
      avatarImage: "/picture/ceo.png",
      initialData: {
        firstName: "Ahmad",
        lastName: "Ali",
        address: "Ramallah - Palestine",
        email: "ahmad@retailmind.com",
        phone: "059-123-4567",
      }
    };
  }
  if (pathname.startsWith("/store-manager")) {
    return { 
      role: "Store Manager", 
      name: "Moath Saleh",
      allowPhotoChange: false,
      avatarImage: "/picture/storemanager.png",
      initialData: {
        firstName: "Moath",
        lastName: "Saleh",
        address: "Nablus - Palestine",
        email: "moath@retailmind.com",
        phone: "059-123-4567",
      }
    };
  }
  if (pathname.startsWith("/inventory-manager")) {
    return { 
      role: "Inventory Manager", 
      name: "Sara Mohammed",
      allowPhotoChange: true,
      avatarImage: "/picture/inventorymanager.png",
      initialData: {
        firstName: "Sara",
        lastName: "Mohammed",
        address: "Jerusalem - Palestine",
        email: "sara@retailmind.com",
        phone: "059-123-4567",
      }
    };
  }
  return { 
    role: "Dashboard", 
    name: "Guest",
    allowPhotoChange: false,
    avatarImage: undefined,
    initialData: {
      firstName: "",
      lastName: "",
      address: "",
      email: "",
      phone: "",
    }
  };
}

export default function Profile() {
  const { initialData, allowPhotoChange, avatarImage } = useRoleAndName();
  const [form, setForm] = useState<ProfileFormData>(initialData);
  const [isEdited, setIsEdited] = useState(false);

  // Debug: Check if avatarImage is being passed correctly
  console.log('Profile - avatarImage:', avatarImage);

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
    setForm(initialData);
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Profile Settings</h1>
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
          </div>
        </div>
      </div>
    </div>
  );
}


