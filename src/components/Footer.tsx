import React from "react";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20 flex items-center justify-center">
                <img
                  src="/picture/retalmind%20(3).jpeg"
                  alt="RetailMind"
                  className="h-9 w-9 rounded-lg"
                />
              </div>
              <div>
                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
                  RetailMind
                </h3>
                <p className="text-xs text-slate-500">POS System</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Advanced Point of Sale system designed to streamline your retail operations and boost productivity.
            </p>
            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#"
                aria-label="Facebook"
                className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/dashboard" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/reports" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Reports
                </Link>
              </li>
              <li>
                <Link to="/settings" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Settings
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Help & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Resources</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Tutorials
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                  Community
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:support@retailmind.com"
                  className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  support@retailmind.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <a
                  href="tel:+970591234567"
                  className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  +970 59 123 4567
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-600">
                  Ramallah, Palestine
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              © {currentYear} RetailMind. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <a href="#" className="hover:text-indigo-600 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-indigo-600 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-indigo-600 transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

