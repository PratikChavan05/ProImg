import React, { useState, useEffect } from 'react'
import { UserData } from '../context/UserContext'
import { useNavigate, Link } from 'react-router-dom'
import { LoadingAnimation } from '../components/Loading'
import { PinData } from '../context/PinContext'
import myimage from '../assets/pra.png'
import { motion } from 'framer-motion'
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa'

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [formError, setFormError] = useState("")
    const [passwordStrength, setPasswordStrength] = useState(0)
    
    const { registerUser, btnLoading } = UserData()
    const navigate = useNavigate()
    const { fetchPins } = PinData()
    
    const googleLogin = () => {
        window.location.href = "https://proimg.onrender.com/api/user/auth/google"
    }
    
    const handleChange = (e) => {
        const { id, value } = e.target
        setFormData(prev => ({
            ...prev,
            [id]: value
        }))
        
        if (id === 'password') {
            checkPasswordStrength(value)
        }
    }
    
    const checkPasswordStrength = (password) => {
        let strength = 0
        
        // Length check
        if (password.length >= 8) strength += 1
        
        // Character variety checks
        if (/[A-Z]/.test(password)) strength += 1
        if (/[0-9]/.test(password)) strength += 1
        if (/[^A-Za-z0-9]/.test(password)) strength += 1
        
        setPasswordStrength(strength)
    }
    
    const submitHandler = (e) => {
        e.preventDefault()
        
        const { name, email, password } = formData
        
        // Enhanced validation
        if (!name.trim() || !email.trim() || !password.trim()) {
            setFormError("Please fill in all fields")
            return
        }
        
        if (password.length < 6) {
            setFormError("Password must be at least 6 characters long")
            return
        }
        
        if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
            setFormError("Please enter a valid email address")
            return
        }
        
        setFormError("")
        registerUser(name, email, password, navigate)
    }
    
    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { 
                duration: 0.5,
                when: "beforeChildren",
                staggerChildren: 0.1
            }
        }
    }
    
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }
    
    // Password strength indicator colors
    const strengthColors = [
        'bg-red-500', // Very weak
        'bg-orange-500', // Weak
        'bg-yellow-500', // Medium
        'bg-green-400', // Good
        'bg-green-600'  // Strong
    ]
    
    return (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-gray-900 p-4'>
            <motion.div 
                className='p-8 rounded-lg shadow-lg w-full max-w-md backdrop-blur-sm bg-opacity-80 bg-[#1A1A1D] border border-gray-800'
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <motion.div className='flex justify-center mb-2' variants={itemVariants}>
              
                </motion.div>
                
                <motion.h2 className='text-xl font-semibold text-center mb-2 text-[#50c878]' variants={itemVariants}>
                    PROIMG
                </motion.h2>
                
                <motion.h2 className='text-2xl font-bold text-white text-center mb-6' variants={itemVariants}>
                    Create Account
                </motion.h2>
                
                {formError && (
                    <motion.div 
                        className='mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-300 text-sm'
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        role="alert"
                    >
                        {formError}
                    </motion.div>
                )}
                
                <form onSubmit={submitHandler} noValidate>
                    <motion.div className='mb-4' variants={itemVariants}>
                        <label htmlFor="name" className='block text-sm font-medium text-gray-300 mb-1'>
                            NAME
                        </label>
                        <div className='relative'>
                            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                                <FaUser className='text-gray-500' />
                            </div>
                            <input 
                                value={formData.name} 
                                onChange={handleChange} 
                                required 
                                type="text" 
                                id='name' 
                                className='w-full py-2 pl-10 pr-3 border border-gray-700 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#50c878] focus:border-transparent' 
                                placeholder='Enter your full name'
                                aria-required="true"
                            />
                        </div>
                    </motion.div>
                    
                    <motion.div className='mb-4' variants={itemVariants}>
                        <label htmlFor="email" className='block text-sm font-medium text-gray-300 mb-1'>
                            EMAIL
                        </label>
                        <div className='relative'>
                            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                                <FaEnvelope className='text-gray-500' />
                            </div>
                            <input 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                                type="email" 
                                id='email' 
                                className='w-full py-2 pl-10 pr-3 border border-gray-700 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#50c878] focus:border-transparent' 
                                placeholder='Enter your email address'
                                aria-required="true"
                            />
                        </div>
                    </motion.div>
                    
                    <motion.div className='mb-4' variants={itemVariants}>
                        <label htmlFor="password" className='block text-sm font-medium text-gray-300 mb-1'>
                            PASSWORD
                        </label>
                        <div className='relative'>
                            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                                <FaLock className='text-gray-500' />
                            </div>
                            <input 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                                type={showPassword ? "text" : "password"} 
                                id='password' 
                                className='w-full py-2 pl-10 pr-10 border border-gray-700 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#50c878] focus:border-transparent' 
                                placeholder='Create a secure password'
                                aria-required="true"
                                minLength="6"
                            />
                            <button
                                type="button"
                                className='absolute inset-y-0 right-0 pr-3 flex items-center'
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? 
                                    <FaEyeSlash className='text-gray-500 hover:text-gray-300' /> : 
                                    <FaEye className='text-gray-500 hover:text-gray-300' />
                                }
                            </button>
                        </div>
                        
                        {formData.password && (
                            <div className="mt-2">
                                <div className="flex space-x-1 mb-1">
                                    {[0, 1, 2, 3].map((index) => (
                                        <div 
                                            key={index} 
                                            className={`h-1 flex-1 rounded-full ${
                                                passwordStrength > index 
                                                    ? strengthColors[passwordStrength] 
                                                    : 'bg-gray-700'
                                            }`}
                                        ></div>
                                    ))}
                                </div>
                                <p className='text-xs text-gray-400'>
                                    {passwordStrength === 0 && "Very weak - add uppercase, numbers, and symbols"}
                                    {passwordStrength === 1 && "Weak - add more variety to your password"}
                                    {passwordStrength === 2 && "Medium - getting better!"}
                                    {passwordStrength === 3 && "Good - your password is strong"}
                                    {passwordStrength === 4 && "Excellent - your password is very strong"}
                                </p>
                            </div>
                        )}
                        
                        <p className='mt-1 text-xs text-gray-400'>Password must be at least 6 characters long</p>
                    </motion.div>
                    
                    <motion.button 
                        type='submit' 
                        className='w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#50c878] hover:bg-[#3daf63] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#50c878] transition-colors duration-200 flex items-center justify-center'
                        disabled={btnLoading}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {btnLoading ? <LoadingAnimation /> : "CREATE ACCOUNT"}
                    </motion.button>
                    
                    <motion.div className='mt-6 text-center' variants={itemVariants}>
                        <div className='relative mb-4'>
                            <div className='absolute inset-0 flex items-center'>
                                <div className='w-full border-t border-gray-700'></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className='px-2 bg-[#1A1A1D] text-gray-400'>or</span>
                            </div>
                        </div>
                        
                        <motion.button 
                            type="button"
                            className="w-full py-2 px-4 border border-gray-600 rounded-md text-white bg-gray-800 hover:bg-gray-700 flex items-center justify-center space-x-2 mb-4"
                            onClick={googleLogin}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FaGoogle className="text-red-500" />
                            <span>Sign up with Google</span>
                        </motion.button>
                        
                        <div className='text-gray-300'>
                            Already have an account?{' '}
                            <Link to="/login" className='font-medium text-[#50c878] hover:underline'>
                                Sign in instead
                            </Link>
                        </div>
                    </motion.div>
                </form>
            </motion.div>
        </div>
    )
}

export default Register