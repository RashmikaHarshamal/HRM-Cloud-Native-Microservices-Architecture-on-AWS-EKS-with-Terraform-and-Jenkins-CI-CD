import React from "react";
import { useNavigate } from "react-router-dom";

const CorporateCollaboration = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">HumanResources</h1>
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-blue-600 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Corporate Collaboration
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            We connect businesses with the right talent to achieve success.
            Our collaborative approach ensures seamless integration and
            exceptional results.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Overview Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            What We Offer
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Strategic Partnerships
              </h3>
              <p className="text-gray-600">
                We build lasting relationships with organizations to understand
                their unique needs and deliver tailored HR solutions that drive
                business growth.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Talent Acquisition
              </h3>
              <p className="text-gray-600">
                Connect with top-tier talent through our extensive network and
                proven recruitment processes that match skills with
                opportunities.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Business Development
              </h3>
              <p className="text-gray-600">
                Our collaborative approach helps you expand your workforce
                strategically, ensuring sustainable growth and competitive
                advantage.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Performance Excellence
              </h3>
              <p className="text-gray-600">
                Together, we create an environment where collaboration drives
                excellence, productivity increases, and organizational goals are
                achieved.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-blue-50 rounded-xl p-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Key Benefits</h2>
          <ul className="grid md:grid-cols-2 gap-6">
            {[
              "Access to a wide network of qualified professionals",
              "Customized HR solutions tailored to your business needs",
              "Reduced time-to-hire and improved hiring quality",
              "Enhanced employer branding and market presence",
              "Continuous support and strategic guidance",
              "Cost-effective talent management solutions",
            ].map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-blue-600 text-2xl font-bold">✓</span>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Ready to Collaborate?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Let's work together to build a stronger, more collaborative
            organization. Get in touch with us today.
          </p>
          <button
            onClick={() => navigate("/contact")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition"
          >
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorporateCollaboration;
