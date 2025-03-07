import { Logo } from "./logo"
import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-gray-900 text-gray-300">
      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo theme="dark" />
            <p className="text-sm max-w-xs">
              Secure medical image sharing platform with AI-powered insights for healthcare professionals and patients.
            </p>
            <div className="flex space-x-4">
              <Link href={{ pathname: "#" }} className="hover:text-primary interactive">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href={{ pathname: "#" }} className="hover:text-primary interactive">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href={{ pathname: "#" }} className="hover:text-primary interactive">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href={{ pathname: "#" }} className="hover:text-primary interactive">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href={{ pathname: "#features" }} className="text-sm hover:text-primary interactive">
                  Features
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "#about" }} className="text-sm hover:text-primary interactive">
                  About Us
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "#faq" }} className="text-sm hover:text-primary interactive">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "/blog" }} className="text-sm hover:text-primary interactive">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href={{ pathname: "/privacy" }} className="text-sm hover:text-primary interactive">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "/terms" }} className="text-sm hover:text-primary interactive">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "/security" }} className="text-sm hover:text-primary interactive">
                  Security
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "/compliance" }} className="text-sm hover:text-primary interactive">
                  Compliance
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4" />
                <span>support@medivault.com</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span>Marietta, GA, USA</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">© {new Date().getFullYear()} MediVault. All rights reserved.</p>
            <p className="text-sm">Made with ❤️ in Georgia, USA</p>
          </div>
        </div>
      </div>
    </footer>
  )
} 