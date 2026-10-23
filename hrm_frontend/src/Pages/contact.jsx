import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setSubmitted(false);
    }, 3000);
  };

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
          <li className="text-blue-600 font-semibold">Contact</li>
        </ul>
      </nav>

      {/* Contact Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">Get In Touch</h1>
          <p className="text-lg text-blue-100">
            We're here to help! Reach out to us with any questions or inquiries.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Contact Information Cards */}
          {[
            {
              icon: "📞",
              title: "Call Us",
              content: "0552223456",
              description: "Monday to Friday, 9AM - 6PM"
            },
            {
              icon: "✉️",
              title: "Email Us",
              content: "info@ruhunahr.com",
              description: "We'll respond within 24 hours"
            },
            {
              icon: "📍",
              title: "Visit Us",
              content: "GALLE, SRI LANKA",
              description: "By appointment"
            }
          ].map((info, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-md p-8 text-center hover:shadow-lg transition-shadow duration-300"
            >
              <div className="text-5xl mb-4">{info.icon}</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {info.title}
              </h3>
              <p className="text-lg font-bold text-blue-600 mb-2">
                {info.content}
              </p>
              <p className="text-gray-600 text-sm">
                {info.description}
              </p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Contact Form */}
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition-colors duration-300"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition-colors duration-300"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition-colors duration-300"
                  placeholder="Your Phone"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition-colors duration-300"
                  placeholder="What is this about?"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition-colors duration-300 resize-none"
                  placeholder="Your message here..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
              >
                Send Message
              </button>

              {submitted && (
                <div className="bg-green-100 border-l-4 border-green-600 text-green-700 p-4 rounded">
                  ✓ Message sent successfully! We'll get back to you soon.
                </div>
              )}
            </form>
          </div>

          {/* Contact Details & Office Hours */}
          <div>
            {/* Office Hours */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Office Hours</h3>
              <div className="space-y-4">
                {[
                  { day: "Monday - Friday", hours: "9:00 AM - 6:00 PM" },
                  { day: "Saturday", hours: "10:00 AM - 4:00 PM" },
                  { day: "Sunday", hours: "Closed" }
                ].map((schedule, index) => (
                  <div key={index} className="flex justify-between pb-4 border-b border-gray-200 last:border-b-0">
                    <span className="font-semibold text-gray-700">{schedule.day}</span>
                    <span className="text-gray-600">{schedule.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-8 border-l-4 border-blue-600">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Response Time</h3>
              <p className="text-gray-700 mb-4">
                We value your time and aim to respond to all inquiries promptly:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">✓</span>
                  <span className="text-gray-700"><strong>Email:</strong> Within 24 hours</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">✓</span>
                  <span className="text-gray-700"><strong>Phone:</strong> Immediate assistance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-3">✓</span>
                  <span className="text-gray-700"><strong>Live Chat:</strong> Available during office hours</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Office Location Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Our Location</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Map */}
            <div className="rounded-lg shadow-md h-96 overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.3286088452306!2d80.76497!3d6.14674!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae38c1d5d5d5d5d%3A0x1234567890!2s25%2FA%20unawatuna%2C%20mihiripenna%2C%20Galle!5e0!3m2!1sen!2slk!4v1642768800000&zoom=15"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Our Office Location"
              ></iframe>
            </div>

            {/* Location Details */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Visit Our Office</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-blue-600 mb-2">📍 Headquarters</h4>
                  <p className="text-gray-700">
                    25/A unawatuna,<br/>
                    mihiripenna,<br/>
                    Galle,<br/> 
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-blue-600 mb-2">🕐 Hours</h4>
                  <p className="text-gray-700">
                    Monday - Friday: 9 AM - 6 PM<br/>
                    Saturday: 10 AM - 4 PM<br/>
                    Sunday: Closed
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-blue-600 mb-2">📞 Hotline</h4>
                  <p className="text-gray-700">
                    <a href="tel:0552223456" className="text-blue-600 hover:underline font-bold">
                      0552223456
                    </a>
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-blue-600 mb-2">✉️ Email</h4>
                  <p className="text-gray-700">
                    <a href="mailto:info@ruhunahr.com" className="text-blue-600 hover:underline font-bold">
                      info@ruhunahr.com
                    </a>
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <a 
                    href="https://maps.app.goo.gl/MSdw16Bxp8TSUfG76" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
                  >
                    📍 View on Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                question: "What is your response time for inquiries?",
                answer: "We typically respond to all inquiries within 24 hours. For urgent matters, please call our hotline during business hours."
              },
              {
                question: "Do you offer free consultations?",
                answer: "Yes! We offer free initial consultations to discuss your HR needs and how our solutions can help your organization."
              },
              {
                question: "What are your payment methods?",
                answer: "We accept all major credit cards, bank transfers, and wire transfers. Flexible payment plans are also available for enterprise clients."
              },
              {
                question: "Can we schedule a demo of your system?",
                answer: "Absolutely! You can request a demo by contacting us via phone or email. We'll arrange a time that works best for you."
              },
              {
                question: "Do you provide training for new users?",
                answer: "Yes, we offer comprehensive training programs for all our clients. Training can be conducted online or on-site depending on your preference."
              },
              {
                question: "What support options are available?",
                answer: "We provide 24/7 technical support via email, phone, and live chat. We also have detailed documentation and video tutorials available."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Q: {faq.question}
                </h3>
                <p className="text-gray-700 ml-4 pl-4 border-l-4 border-blue-600">
                  A: {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your HR?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Contact us today to learn how HumanResources can streamline your operations.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate("/services")}
              className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-3 rounded-lg shadow-lg transition-colors duration-300"
            >
              Explore Services
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
          <div className="mt-4 flex gap-4 justify-center text-sm">
            <a href="tel:0552223456" className="hover:text-blue-400">Call: 0552223456</a>
            <span className="text-gray-600">|</span>
            <a href="mailto:info@ruhunahr.com" className="hover:text-blue-400">Email: info@ruhunahr.com</a>
          </div>
        </div>
      </footer>
    </section>
  );
};

export default Contact;
