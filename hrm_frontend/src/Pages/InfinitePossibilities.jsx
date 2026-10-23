import React from "react";
import { useNavigate } from "react-router-dom";

const InfinitePossibilities = () => {
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Infinite Possibilities
          </h1>
          <p className="text-purple-100 text-lg max-w-2xl">
            Empowering organizations to reach new heights through innovation.
            Unlock your organization's potential with our cutting-edge solutions.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Innovation Pillars */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Innovation Pillars
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Digital Transformation
              </h3>
              <p className="text-gray-600">
                Leverage modern technology and automation to revolutionize your
                HR operations, improve employee experience, and unlock new
                efficiencies.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                AI & Analytics
              </h3>
              <p className="text-gray-600">
                Harness the power of artificial intelligence and predictive
                analytics to make smarter decisions, identify talent gaps, and
                predict future trends.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Global Workforce
              </h3>
              <p className="text-gray-600">
                Manage distributed teams across geographies seamlessly with our
                global HR solutions designed for the modern, connected workplace.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Innovation Culture
              </h3>
              <p className="text-gray-600">
                Build a culture of continuous innovation where employees are
                empowered to think creatively and drive positive change across
                your organization.
              </p>
            </div>
          </div>
        </div>

        {/* Solutions Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">
            Next-Generation Solutions
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🤖",
                title: "Intelligent Hiring",
                desc: "AI-powered recruitment that matches candidates with roles based on skills, culture fit, and long-term potential.",
              },
              {
                icon: "📱",
                title: "Employee Engagement",
                desc: "Modern platforms that foster connection, collaboration, and continuous feedback in real-time.",
              },
              {
                icon: "📚",
                title: "Learning Ecosystem",
                desc: "Personalized learning paths powered by AI that develop skills and prepare employees for future roles.",
              },
              {
                icon: "💬",
                title: "Instant Feedback",
                desc: "Real-time feedback mechanisms that help employees grow, improve, and exceed expectations.",
              },
              {
                icon: "🎯",
                title: "Performance Analytics",
                desc: "Predictive analytics to identify high performers, retention risks, and development opportunities.",
              },
              {
                icon: "🔄",
                title: "Agile HR Processes",
                desc: "Flexible, scalable HR operations that adapt quickly to changing business needs and market demands.",
              },
            ].map((solution, idx) => (
              <div key={idx} className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-lg shadow hover:shadow-lg transition">
                <div className="text-4xl mb-3">{solution.icon}</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {solution.title}
                </h3>
                <p className="text-gray-600 text-sm">{solution.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vision Section */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-12 mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Our Vision for the Future
          </h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-gray-700 text-lg mb-6 leading-relaxed">
              We believe the future of work is boundless. Organizations that
              embrace innovation, invest in their people, and leverage cutting-edge
              technology will unlock infinite possibilities for growth and success.
            </p>
            <p className="text-gray-700 text-lg mb-6 leading-relaxed">
              Our mission is to empower organizations with the tools, insights,
              and strategies they need to transform their HR operations and unlock
              the full potential of their workforce.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                "80% increase in productivity",
                "40% reduction in hiring time",
                "60% improved retention rates",
              ].map((stat, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg text-center shadow">
                  <p className="text-purple-600 font-bold text-lg">{stat}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Showcase */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Why Choose Us
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Technology-First Approach",
                desc: "We combine best-in-class technology with human expertise to deliver superior results.",
              },
              {
                title: "Scalable Solutions",
                desc: "Whether you have 10 or 10,000 employees, our solutions grow with your organization.",
              },
              {
                title: "Continuous Innovation",
                desc: "We constantly evolve our offerings to stay ahead of market trends and client needs.",
              },
              {
                title: "Data Security",
                desc: "Enterprise-grade security and compliance to protect your most valuable asset—your people.",
              },
              {
                title: "Expert Support",
                desc: "Dedicated teams of HR professionals and technologists supporting your success journey.",
              },
              {
                title: "Measurable ROI",
                desc: "Transparent metrics and analytics that demonstrate clear business impact and value.",
              },
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-white rounded-lg shadow">
                <div className="text-purple-600 text-2xl font-bold flex-shrink-0">
                  ✓
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Ready to Unlock Infinite Possibilities?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join forward-thinking organizations that are already transforming
            their HR operations and achieving extraordinary results.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-8 py-3 rounded-lg transition"
          >
            Get Started Today
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfinitePossibilities;
