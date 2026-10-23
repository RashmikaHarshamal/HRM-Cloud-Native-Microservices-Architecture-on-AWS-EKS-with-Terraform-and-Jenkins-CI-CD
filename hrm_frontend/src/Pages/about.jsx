import React from "react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

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
          <li className="text-blue-600 font-semibold">About</li>
          <li 
            onClick={() => navigate("/services")} 
            className="hover:text-blue-400 cursor-pointer text-gray-700"
          >
            Services
          </li>
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

      {/* About Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">About Us</h1>
          <p className="text-lg text-blue-100">
            Transforming Human Resource Management with Innovation and Excellence
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Mission Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            At HumanResources, we are dedicated to revolutionizing the way organizations
            manage their human capital. Our mission is to provide innovative, user-friendly
            solutions that streamline HR processes and foster a culture of transparency,
            efficiency, and employee engagement.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We believe that effective HR management is the backbone of any successful
            organization. By leveraging modern technology and best practices, we empower
            businesses to focus on what matters most: their people.
          </p>
        </div>

        {/* Vision Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Vision</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            To become the most trusted and innovative HR management solution provider,
            helping organizations worldwide build stronger teams and achieve unprecedented growth.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We envision a future where HR management is seamless, transparent, and empowering
            for both employers and employees alike.
          </p>
        </div>

        {/* Core Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Innovation",
                description: "We constantly innovate to provide cutting-edge solutions that address evolving HR challenges.",
                icon: "💡"
              },
              {
                title: "Integrity",
                description: "We operate with transparency and honesty, building trust with our clients and partners.",
                icon: "🤝"
              },
              {
                title: "Excellence",
                description: "We strive for excellence in everything we do, delivering superior quality and service.",
                icon: "⭐"
              },
              {
                title: "Customer Focus",
                description: "Your success is our success. We prioritize understanding and meeting your unique needs.",
                icon: "👥"
              },
              {
                title: "Sustainability",
                description: "We are committed to sustainable business practices that benefit society and the environment.",
                icon: "🌱"
              },
              {
                title: "Teamwork",
                description: "We believe in the power of collaboration and teamwork to achieve greater results.",
                icon: "🎯"
              }
            ].map((value, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Us Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Why Choose Us?</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <ul className="space-y-4">
              {[
                "Advanced Technology: State-of-the-art platform built with modern technology stack",
                "User-Friendly Interface: Intuitive design that requires minimal training",
                "Comprehensive Features: All-in-one solution for your HR management needs",
                "Expert Support: Dedicated team ready to assist you 24/7",
                "Scalability: Solution grows with your organization",
                "Security: Enterprise-grade security to protect your sensitive data",
                "Customization: Flexible solutions tailored to your specific requirements",
                "Cost-Effective: Competitive pricing without compromising quality"
              ].map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 font-bold mr-4">✓</span>
                  <span className="text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your HR?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Join thousands of organizations already using HumanResources to streamline
            their HR operations and empower their teams.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate("/login")}
              className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-3 rounded-lg shadow-lg transition-colors duration-300"
            >
              Get Started
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

export default About;
