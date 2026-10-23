import React from "react";
import { useNavigate } from "react-router-dom";

const Services = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: "👥",
      title: "Employee Management",
      description: "Streamlined employee records, onboarding, and lifecycle management with a centralized database.",
      features: ["Employee profiles", "Document management", "Skills tracking", "Performance records"]
    },
    {
      icon: "📅",
      title: "Attendance & Timekeeping",
      description: "Automated attendance tracking with real-time monitoring and detailed reports.",
      features: ["Biometric integration", "Real-time attendance", "Late arrival tracking", "Absence reports"]
    },
    {
      icon: "🏖️",
      title: "Leave Management",
      description: "Comprehensive leave management system with approval workflows and balance tracking.",
      features: ["Leave requests", "Approval workflow", "Balance tracking", "Compliance reporting"]
    },
    {
      icon: "💰",
      title: "Payroll Management",
      description: "Automated payroll processing with salary calculations, deductions, and tax management.",
      features: ["Salary processing", "Deduction management", "Tax calculation", "Payslip generation"]
    },
    {
      icon: "📊",
      title: "Analytics & Reporting",
      description: "Comprehensive dashboards and reports for data-driven HR decision making.",
      features: ["Custom reports", "Analytics dashboard", "KPI tracking", "Data visualization"]
    },
    {
      icon: "🔒",
      title: "Data Security",
      description: "Enterprise-grade security with role-based access control and data encryption.",
      features: ["Data encryption", "Access control", "Audit trails", "Compliance management"]
    }
  ];

  const benefits = [
    {
      title: "Increased Efficiency",
      description: "Automate repetitive HR tasks and reduce manual errors by up to 80%"
    },
    {
      title: "Cost Savings",
      description: "Reduce HR operational costs and improve budget allocation"
    },
    {
      title: "Better Decision Making",
      description: "Access real-time data and insights for strategic HR decisions"
    },
    {
      title: "Employee Satisfaction",
      description: "Improve employee experience with transparent and efficient processes"
    },
    {
      title: "Compliance",
      description: "Ensure compliance with labor laws and regulations"
    },
    {
      title: "Scalability",
      description: "Easily scale your HR operations as your business grows"
    }
  ];

  return (
    <section className="bg-gray-50 min-h-screen">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-10 py-6 bg-white shadow-md">
        <h1 className="text-lg font-semibold text-blue-600">HumanResources</h1>
        <ul className="flex gap-8 text-sm font-medium">
          <li 
            onClick={() => navigate("/")} 
            className="hover:text-blue-400 cursor-pointer text-gray-700"
          >
            Home
          </li>
          <li 
            onClick={() => navigate("/about")} 
            className="hover:text-blue-400 cursor-pointer text-gray-700"
          >
            About
          </li>
          <li className="text-blue-600 font-semibold">Services</li>
          <li 
            onClick={() => navigate("/blog")} 
            className="hover:text-blue-400 cursor-pointer text-gray-700"
          >
            Blog
          </li>
          <li 
            onClick={() => navigate("/contact")} 
            className="hover:text-blue-400 cursor-pointer text-gray-700"
          >
            Contact
          </li>
        </ul>
      </nav>

      {/* Services Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">Our Services</h1>
          <p className="text-lg text-blue-100">
            Comprehensive HR solutions designed to streamline your business operations
          </p>
        </div>
      </div>

      {/* Main Services Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-gray-800 mb-4 text-center">
          Complete HR Management Suite
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
          Our integrated platform offers all the tools you need to manage your human resources
          efficiently and effectively. From recruitment to retirement, we've got you covered.
        </p>

        {/* Service Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="text-5xl mb-4">{service.icon}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                {service.title}
              </h3>
              <p className="text-gray-600 mb-6">
                {service.description}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Key Features:</p>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <span className="text-blue-600 font-bold mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Service Process Section */}
        <div className="bg-white rounded-lg shadow-md p-12 mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-10 text-center">
            How Our Services Work
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Setup & Configuration",
                description: "We configure the system according to your organization's requirements"
              },
              {
                step: "2",
                title: "Data Migration",
                description: "Seamlessly migrate your existing HR data with zero data loss"
              },
              {
                step: "3",
                title: "Training & Support",
                description: "Comprehensive training for your HR team and ongoing 24/7 support"
              },
              {
                step: "4",
                title: "Optimization",
                description: "Continuous monitoring and optimization for peak performance"
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-10 text-center">
            Benefits of Our Services
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-600"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-700">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Info Section */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-12 mb-16 border border-blue-200">
          <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
            Flexible Pricing Plans
          </h2>
          <p className="text-center text-gray-700 mb-8 max-w-3xl mx-auto">
            We offer flexible pricing plans tailored to businesses of all sizes. Whether you're a startup
            or an enterprise, we have a plan that fits your budget and requirements.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Starter", price: "$99/month", users: "Up to 50 employees" },
              { name: "Professional", price: "$299/month", users: "Up to 200 employees" },
              { name: "Enterprise", price: "Custom", users: "Unlimited employees" }
            ].map((plan, index) => (
              <div key={index} className="bg-white rounded-lg p-6 text-center shadow-md">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">{plan.price}</div>
                <p className="text-gray-600">{plan.users}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Transform your HR operations today. Sign up for a free trial or schedule a demo
            to see how our services can benefit your organization.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate("/login")}
              className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-3 rounded-lg shadow-lg transition-colors duration-300"
            >
              Start Free Trial
            </button>
            <button 
              onClick={() => navigate("/")}
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-3 rounded-lg shadow-lg transition-colors duration-300"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p>&copy; 2026 HumanResources. All rights reserved.</p>
        </div>
      </footer>
    </section>
  );
};

export default Services;
