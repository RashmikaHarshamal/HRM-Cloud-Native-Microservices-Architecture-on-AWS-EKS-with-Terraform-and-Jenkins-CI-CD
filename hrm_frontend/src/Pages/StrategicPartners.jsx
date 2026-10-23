import React from "react";
import { useNavigate } from "react-router-dom";

const StrategicPartners = () => {
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
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Strategic Partners
          </h1>
          <p className="text-green-100 text-lg max-w-2xl">
            Helping you plan sustainable HR strategies for long-term growth.
            Partner with us to transform your human resources landscape.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Overview Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Partnership Excellence
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Strategy Development
              </h3>
              <p className="text-gray-600">
                We work closely with your leadership team to develop
                comprehensive HR strategies that align with your business
                objectives and drive sustainable growth.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Data-Driven Insights
              </h3>
              <p className="text-gray-600">
                Leverage advanced analytics and industry benchmarks to make
                informed decisions about your workforce, budgets, and talent
                initiatives.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Organizational Development
              </h3>
              <p className="text-gray-600">
                Build a strong organizational culture through our expert
                consulting on structure, roles, and team development programs.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Talent Development
              </h3>
              <p className="text-gray-600">
                Create pipelines of future leaders through strategic training,
                mentoring, and succession planning initiatives tailored to your
                organization.
              </p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="bg-green-50 rounded-xl p-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">
            What We Provide
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Strategic Consulting",
                items: [
                  "HR roadmap development",
                  "Organizational restructuring",
                  "Change management support",
                  "Performance optimization",
                ],
              },
              {
                title: "Talent Management",
                items: [
                  "Recruitment strategy",
                  "Leadership development",
                  "Succession planning",
                  "Skills assessment",
                ],
              },
              {
                title: "Process Excellence",
                items: [
                  "Workflow optimization",
                  "System implementation",
                  "Policy development",
                  "Compliance management",
                ],
              },
            ].map((service, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {service.title}
                </h3>
                <ul className="space-y-2">
                  {service.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-gray-600"
                    >
                      <span className="text-green-600 font-bold">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Long-term Value Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Building Long-Term Value
          </h2>
          <div className="bg-white rounded-xl p-12 shadow-md">
            <div className="space-y-6">
              <div className="flex gap-6 items-start">
                <div className="text-4xl flex-shrink-0">1️⃣</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Assess & Align
                  </h3>
                  <p className="text-gray-600">
                    We conduct a thorough assessment of your current HR practices
                    and align them with your business goals.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="text-4xl flex-shrink-0">2️⃣</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Plan & Strategize
                  </h3>
                  <p className="text-gray-600">
                    Together, we create a detailed roadmap with specific
                    initiatives, timelines, and metrics for success.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="text-4xl flex-shrink-0">3️⃣</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Implement & Support
                  </h3>
                  <p className="text-gray-600">
                    We guide implementation with ongoing support and training to
                    ensure successful adoption and sustained results.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="text-4xl flex-shrink-0">4️⃣</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Measure & Optimize
                  </h3>
                  <p className="text-gray-600">
                    Continuous monitoring and optimization ensures your HR
                    strategies deliver measurable business impact.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Partner With Us for Success
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Let's develop the HR strategy that will drive your organization
            forward. Reach out to discuss your goals today.
          </p>
          <button
            onClick={() => navigate("/contact")}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-3 rounded-lg transition"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategicPartners;
