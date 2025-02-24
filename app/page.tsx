"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Brain, Clock, Share2, Shield, Users2, BarChart3 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Chatbot } from "@/components/chatbot"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/logo"
import { ThemePicker } from "@/components/theme-picker"

export default function Home() {
  const [theme, setTheme] = useState("light")

  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-theme" : "light-theme"
  }, [theme])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className={`flex min-h-screen flex-col ${theme}-theme`}>
      <header
        className={`sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60 navbar ${theme}-theme`}
      >
        <div className="container flex h-16 items-center justify-between pl-4 sm:pl-6 lg:pl-8">
          <Link href="/" className="flex items-center space-x-2 interactive">
            <Logo theme={theme} />
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm font-medium hover:text-primary interactive navbar-link"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="text-sm font-medium hover:text-primary interactive navbar-link"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm font-medium hover:text-primary interactive navbar-link"
            >
              FAQ
            </button>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild className={`interactive login-button ${theme}-theme`}>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className={`interactive signup-button ${theme}-theme`}>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <ThemePicker theme={theme} setTheme={setTheme} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-12 md:py-24">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-4 px-4 sm:px-6 lg:px-8">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-center sm:text-left">
                Secure Imaging Vault
              </h1>
              <p className="text-muted-foreground md:text-xl text-center sm:text-left">
                Share and store medical images securely with AI-powered insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
                <Button size="lg" asChild className="interactive cta-button">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <Image src="/demo.gif" alt="MediVault Demo" width={600} height={400} className="rounded-lg shadow-lg" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className={`container py-12 md:py-24 bg-background ${theme}-theme`}>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">Key Features</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 bordered feature-card">
              <Shield className="h-12 w-12 mb-4 feature-icon" />
              <h3 className="text-xl font-bold mb-2">Secure Storage</h3>
              <p className="text-muted-foreground">
                Your medical images are encrypted and stored with the highest security standards.
              </p>
            </Card>
            <Card className="p-6 bordered feature-card">
              <Share2 className="h-12 w-12 mb-4 feature-icon" />
              <h3 className="text-xl font-bold mb-2">Easy Sharing</h3>
              <p className="text-muted-foreground">
                Share your medical images with healthcare providers securely and effortlessly.
              </p>
            </Card>
            <Card className="p-6 bordered feature-card">
              <Brain className="h-12 w-12 mb-4 feature-icon" />
              <h3 className="text-xl font-bold mb-2">AI-Powered Insights</h3>
              <p className="text-muted-foreground">
                Get intelligent insights and analysis of your medical images using advanced AI.
              </p>
            </Card>
            <Card className="p-6 bordered feature-card">
              <Clock className="h-12 w-12 mb-4 feature-icon" />
              <h3 className="text-xl font-bold mb-2">Real-time Collaboration</h3>
              <p className="text-muted-foreground">
                Collaborate with healthcare professionals in real-time for faster diagnoses.
              </p>
            </Card>
            <Card className="p-6 bordered feature-card">
              <Users2 className="h-12 w-12 mb-4 feature-icon" />
              <h3 className="text-xl font-bold mb-2">Patient Portal</h3>
              <p className="text-muted-foreground">
                Access your medical images and reports through a user-friendly patient portal.
              </p>
            </Card>
            <Card className="p-6 bordered feature-card">
              <BarChart3 className="h-12 w-12 mb-4 feature-icon" />
              <h3 className="text-xl font-bold mb-2">Analytics Dashboard</h3>
              <p className="text-muted-foreground">
                Track and analyze your medical imaging history with comprehensive analytics.
              </p>
            </Card>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className={`container py-12 md:py-24 bg-muted ${theme}-theme`}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-4">What is MediVault?</h2>
            <p className="text-muted-foreground md:text-xl mb-12">
              MediVault is a cutting-edge medical image sharing platform that combines security, accessibility, and
              AI-powered insights. Our name, "MediVault," represents our commitment to providing a secure vault for your
              valuable medical imaging data.
            </p>
            <h3 className="text-2xl font-bold mb-8">Why Choose MediVault?</h3>
            <div className="text-left space-y-4">
              <div>
                <h4 className="font-bold">Unparalleled Security:</h4>
                <p className="text-muted-foreground">
                  We use state-of-the-art encryption to ensure your medical data remains private and protected.
                </p>
              </div>
              <div>
                <h4 className="font-bold">Seamless Collaboration:</h4>
                <p className="text-muted-foreground">
                  MediVault facilitates easy sharing and real-time collaboration between patients and healthcare
                  providers.
                </p>
              </div>
              <div>
                <h4 className="font-bold">AI-Driven Insights:</h4>
                <p className="text-muted-foreground">
                  Our advanced AI algorithms provide valuable insights and assist in faster, more accurate diagnoses.
                </p>
              </div>
              <div>
                <h4 className="font-bold">User-Friendly Interface:</h4>
                <p className="text-muted-foreground">
                  MediVault offers an intuitive and easy-to-use interface, making it simple for both healthcare
                  providers and patients to navigate and utilize the platform effectively.
                </p>
              </div>
              <div>
                <h4 className="font-bold">Compliance:</h4>
                <p className="text-muted-foreground">
                  MediVault is fully compliant with major healthcare regulations, including HIPAA and GDPR, ensuring
                  that your medical data is handled in accordance with the highest industry standards.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className={`container py-12 md:py-24 bg-background ${theme}-theme`}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How secure is MediVault?</AccordionTrigger>
                <AccordionContent>
                  MediVault uses enterprise-grade encryption and follows all healthcare data protection regulations to
                  ensure your medical images and data are completely secure. We employ end-to-end encryption, regular
                  security audits, and comply with HIPAA and other relevant standards.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Can I share my medical images with my doctor?</AccordionTrigger>
                <AccordionContent>
                  Yes, you can easily and securely share your medical images with any healthcare provider through our
                  platform. They'll receive a secure link to access your images, which can be time-limited for added
                  security.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>What types of medical images can I store?</AccordionTrigger>
                <AccordionContent>
                  MediVault supports all common medical image formats including DICOM, X-rays, MRIs, CT scans,
                  ultrasounds, and more. Our platform is designed to handle high-resolution medical imaging files while
                  maintaining their quality and metadata.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>How does the AI-powered insight feature work?</AccordionTrigger>
                <AccordionContent>
                  Our AI-powered insight feature uses advanced machine learning algorithms to analyze medical images and
                  provide preliminary observations. It can detect patterns, anomalies, and potential areas of concern,
                  which can assist healthcare providers in making more informed decisions. However, these insights are
                  meant to supplement, not replace, professional medical interpretation.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>Is MediVault compliant with healthcare regulations?</AccordionTrigger>
                <AccordionContent>
                  Yes, MediVault is fully compliant with major healthcare regulations including HIPAA in the United
                  States, GDPR in Europe, and other relevant data protection laws. We regularly update our systems to
                  ensure ongoing compliance with evolving regulations in the healthcare industry.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

      <Footer />

      <Chatbot />
    </div>
  )
}

