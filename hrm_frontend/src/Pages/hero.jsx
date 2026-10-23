import React, { useState } from "react";
import heroImg from "../assets/hrm-hero-illustration.png";
import { useNavigate } from 'react-router-dom';
import { Building2 } from "lucide-react";
import CompanyRequestModal from "../components/CompanyRequestModal";

const Hero = () => {

  const navigate = useNavigate();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  return (
    <section className="relative bg-gray-50">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Hero"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay to make text readable */}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Navbar */}
      <nav className="relative flex justify-between items-center px-10 py-6 z-10 text-white">
        <h1 className="text-lg font-semibold">HumanResources</h1>
        <ul className="flex gap-8 text-sm font-medium items-center">
          <li className="hover:text-blue-400 cursor-pointer">Home</li>
          <li 
            onClick={() => navigate('/about')} 
            className="hover:text-blue-400 cursor-pointer"
          >
            About
          </li>
          <li 
            onClick={() => navigate('/services')} 
            className="hover:text-blue-400 cursor-pointer"
          >
            Services
          </li>
          <li 
            onClick={() => navigate('/blog')} 
            className="hover:text-blue-400 cursor-pointer"
          >
            Blog
          </li>
          <li 
            onClick={() => navigate('/contact')} 
            className="hover:text-blue-400 cursor-pointer"
          >
            Contact
          </li>
        </ul>
      </nav>

      {/* Hero Text */}
      <div className="relative z-10 px-10 py-32 max-w-3xl text-white">
        <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          We Are Your Partners in{" "}
          <span className="text-blue-400">Human Resource</span>
        </h2>
        <p className="text-gray-200 mb-8">
          Streamline workforce operations, employee onboarding, attendance tracking, and payroll with our multi-tenant cloud HRM platform.
        </p>
    
    <div className="flex flex-wrap gap-4">
        {/* Request Application */}
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="w-[200px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
        >
        <Building2 size={18} />
          Request 
        </button>

        {/* Get Started */}
        <button
          onClick={() => navigate('/login')}
          className="w-[200px] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center transform hover:-translate-y-0.5"
        >
          Get Started
        </button>

        {/* Learn More */}
        <button
          className="w-[200px] bg-white/90 hover:bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center transform hover:-translate-y-0.5"
        >
          Learn More
        </button>
    </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 mt-24 flex flex-col md:flex-row justify-center gap-8 px-6 pb-24">
        {[
          {
            title: "Corporate Collaboration",
            desc: "We connect businesses with the right talent to achieve success.",
            icon: "💼",
          },
          {
            title: "Strategic Partners",
            desc: "Helping you plan sustainable HR strategies for long-term growth.",
            icon: "🤝",
          },
          {
            title: "Infinite Possibilities",
            desc: "Empowering organizations to reach new heights through innovation.",
            icon: "🚀",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white/60 backdrop-blur-lg border border-gray-200 w-full md:w-1/3 p-8 rounded-2xl shadow-lg text-center transition-all duration-300 hover:bg-white/70"
          >
            <div className="text-5xl mb-4">{card.icon}</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              {card.title}
            </h3>
            <p className="text-gray-700 text-sm mb-4">{card.desc}</p>
            <button className="text-blue-600 font-medium hover:underline">
              Learn More
            </button>
          </div>
        ))}
      </div>

      {/* Company Registration Request Modal */}
      {isRequestModalOpen && (
        <CompanyRequestModal onClose={() => setIsRequestModalOpen(false)} />
      )}
    </section>
  );
};

export default Hero;
