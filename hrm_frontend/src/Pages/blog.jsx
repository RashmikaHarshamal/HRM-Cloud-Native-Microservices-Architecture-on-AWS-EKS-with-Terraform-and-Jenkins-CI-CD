import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Blog = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const blogPosts = [
    {
      id: 1,
      title: "The Future of HR Technology",
      category: "technology",
      date: "January 15, 2026",
      author: "Sarah Johnson",
      image: "📱",
      excerpt: "Discover how AI and machine learning are transforming the HR landscape and what it means for your organization.",
      content: "HR technology is evolving at an unprecedented pace. From AI-powered recruitment to predictive analytics for employee retention, the future of HR is here. Organizations that embrace these technologies are seeing significant improvements in efficiency, employee engagement, and business outcomes."
    },
    {
      id: 2,
      title: "5 Tips for Effective Remote Team Management",
      category: "management",
      date: "January 12, 2026",
      author: "Michael Chen",
      image: "👥",
      excerpt: "Learn proven strategies to lead and motivate your remote team effectively in today's distributed workforce.",
      content: "Managing remote teams requires a different approach. Clear communication, trust-building, and proper tools are essential. This guide covers five practical tips to help you lead your remote team successfully while maintaining productivity and morale."
    },
    {
      id: 3,
      title: "Understanding Employee Engagement",
      category: "engagement",
      date: "January 10, 2026",
      author: "Emma Williams",
      image: "😊",
      excerpt: "Explore the key drivers of employee engagement and how to create a workplace culture that motivates your team.",
      content: "Employee engagement goes beyond job satisfaction. It's about creating an environment where employees feel valued, heard, and motivated. This comprehensive guide explores the key drivers of engagement and practical strategies to implement them."
    },
    {
      id: 4,
      title: "Streamlining Payroll Operations",
      category: "payroll",
      date: "January 8, 2026",
      author: "David Martinez",
      image: "💳",
      excerpt: "Automate your payroll process and eliminate costly errors with modern HR systems.",
      content: "Payroll processing can be complex and error-prone. Modern HR systems offer automation capabilities that can streamline the entire process, reduce errors, ensure compliance, and free up your team to focus on strategic initiatives."
    },
    {
      id: 5,
      title: "Improving Workplace Diversity and Inclusion",
      category: "culture",
      date: "January 5, 2026",
      author: "Lisa Anderson",
      image: "🌍",
      excerpt: "Best practices for building a diverse and inclusive workplace that benefits your organization and employees.",
      content: "Diversity and inclusion are not just ethical imperatives—they're business imperatives. Organizations with diverse teams are more innovative, resilient, and successful. Learn actionable strategies to build a truly inclusive workplace."
    },
    {
      id: 6,
      title: "Performance Management Best Practices",
      category: "management",
      date: "January 1, 2026",
      author: "Robert Wilson",
      image: "📈",
      excerpt: "Transform your performance management process to drive employee growth and organizational success.",
      content: "Traditional performance reviews are evolving. Modern performance management focuses on continuous feedback, development, and alignment with organizational goals. Discover how to implement a performance management system that works."
    },
    {
      id: 7,
      title: "Leave Management Strategy Guide",
      category: "payroll",
      date: "December 28, 2025",
      author: "Jessica Brown",
      image: "🏖️",
      excerpt: "Optimize your leave management process while ensuring compliance and employee satisfaction.",
      content: "Effective leave management balances employee well-being with organizational needs. This guide covers policy design, compliance requirements, and technology solutions to streamline your leave management process."
    },
    {
      id: 8,
      title: "Building Your HR Analytics Dashboard",
      category: "technology",
      date: "December 25, 2025",
      author: "Thomas Garcia",
      image: "📊",
      excerpt: "Harness the power of data to make informed HR decisions and drive business results.",
      content: "HR analytics transforms raw data into actionable insights. Learn how to build an effective HR analytics dashboard that provides visibility into key metrics like turnover, hiring efficiency, and employee satisfaction."
    }
  ];

  const categories = [
    { id: "all", label: "All Posts" },
    { id: "technology", label: "Technology" },
    { id: "management", label: "Management" },
    { id: "engagement", label: "Engagement" },
    { id: "payroll", label: "Payroll" },
    { id: "culture", label: "Culture" }
  ];

  const filteredPosts = selectedCategory === "all" 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

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
            className="text-blue-600 font-semibold"
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

      {/* Blog Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">Our Blog</h1>
          <p className="text-lg text-blue-100">
            Insights, tips, and best practices for modern HR management
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Category Filter */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Filter by Category</h2>
          <div className="flex flex-wrap gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-600"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mb-16">
          {filteredPosts.map((post) => (
            <div 
              key={post.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              {/* Post Image/Icon */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-48 flex items-center justify-center text-8xl">
                {post.image}
              </div>

              {/* Post Content */}
              <div className="p-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">
                    {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
                  </span>
                  <span className="text-gray-500 text-sm">{post.date}</span>
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-3 line-clamp-2">
                  {post.title}
                </h3>

                <p className="text-gray-600 mb-4">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">By {post.author}</span>
                  <button 
                    onClick={() => window.scrollTo(0, 0)}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm hover:underline"
                  >
                    Read More →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Posts Message */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No posts found in this category.</p>
          </div>
        )}

        {/* Featured Section */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-12 border border-blue-200 mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Stay Updated</h2>
          <p className="text-gray-700 mb-6">
            Subscribe to our newsletter to receive the latest HR insights, tips, and industry trends directly in your inbox.
          </p>
          <div className="flex gap-4 max-w-md">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600"
            />
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors duration-300">
              Subscribe
            </button>
          </div>
        </div>

        {/* Recent Comments Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Reader Insights</h2>
          <div className="space-y-6">
            {[
              {
                author: "John Smith",
                comment: "Great insights on HR technology! We've implemented several of these recommendations and already seeing results.",
                post: "The Future of HR Technology"
              },
              {
                author: "Maria Garcia",
                comment: "The remote team management tips were exactly what we needed. Very practical and actionable.",
                post: "5 Tips for Effective Remote Team Management"
              },
              {
                author: "Alex Chen",
                comment: "This article on employee engagement has completely changed how we approach team management.",
                post: "Understanding Employee Engagement"
              }
            ].map((item, index) => (
              <div key={index} className="border-l-4 border-blue-600 pl-6">
                <p className="text-gray-700 italic mb-2">"{item.comment}"</p>
                <p className="text-sm text-gray-600">
                  <strong>{item.author}</strong> on "<span className="text-blue-600">{item.post}</span>"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Have Questions or Need Help?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Explore our comprehensive HR solution or contact our support team for personalized guidance.
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
        </div>
      </footer>
    </section>
  );
};

export default Blog;
