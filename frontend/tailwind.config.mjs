/** @type {import('tailwindcss').Config} */

export default {
  darkMode: ['class'],
  content: [
    './src/**/*.{mjs,js,ts,jsx,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
  	extend: {
  		colors: {
  			'app-colors': {
  				'100': '#A9D9D4',
  				'200': '#80BFB4',
  				'300': '#94ea43',
  				'400': '#1E2615',
  				'500': '#0f0f0f'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			display: [
  				'"Roboto Condensed"',
  				'Roboto',
  				'sans-serif'
  			],
  			'main-font': [
  				'Roboto"',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		transitionTimingFunction: {
  			'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)'
  		},
  		keyframes: {
  			'write-in': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(6px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'blur-in': {
  				from: {
  					opacity: '0',
  					filter: 'blur(6px)',
  					transform: 'translateY(4px)'
  				},
  				to: {
  					opacity: '1',
  					filter: 'blur(0)',
  					transform: 'translateY(0)'
  				}
  			},
  			'cell-in': {
  				from: {
  					backgroundColor: 'transparent',
  					boxShadow: 'inset 0 0 0 var(--cell-half) #141414'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'check-draw': {
  				from: {
  					strokeDashoffset: '24'
  				},
  				to: {
  					strokeDashoffset: '0'
  				}
  			},
  			'ring-out': {
  				from: {
  					opacity: '0.4',
  					transform: 'scale(1)'
  				},
  				to: {
  					opacity: '0',
  					transform: 'scale(1.8)'
  				}
  			},
  			'tick-in': {
  				from: {
  					opacity: '0',
  					transform: 'scaleY(0.4)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scaleY(1)'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'dropdown-in': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(var(--dropdown-shift, -6px)) scaleY(var(--dropdown-scale, 0.96))'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0) scaleY(1)'
  				}
  			},
  			'dialog-in': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(8px) scale(0.97)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0) scale(1)'
  				}
  			},
  			'dialog-out': {
  				from: {
  					opacity: '1',
  					transform: 'translateY(0) scale(1)'
  				},
  				to: {
  					opacity: '0',
  					transform: 'translateY(4px) scale(0.98)'
  				}
  			},
  			'overlay-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'overlay-out': {
  				from: {
  					opacity: '1'
  				},
  				to: {
  					opacity: '0'
  				}
  			},
  			'dropdown-out': {
  				from: {
  					opacity: '1',
  					transform: 'translateY(0) scaleY(1)'
  				},
  				to: {
  					opacity: '0',
  					transform: 'translateY(var(--dropdown-shift, -6px)) scaleY(var(--dropdown-scale, 0.96))'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'write-in': 'write-in 420ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
  			'blur-in': 'blur-in 700ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
  			'cell-in': 'cell-in 550ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
  			'fade-in': 'fade-in 600ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
  			'check-draw': 'check-draw 360ms cubic-bezier(0.23, 1, 0.32, 1) 120ms backwards',
  			'ring-out': 'ring-out 700ms cubic-bezier(0.23, 1, 0.32, 1) 200ms both',
  			'tick-in': 'tick-in 320ms cubic-bezier(0.23, 1, 0.32, 1) backwards',
  			'dropdown-in': 'dropdown-in 200ms cubic-bezier(0.23, 1, 0.32, 1)',
  			'dropdown-out': 'dropdown-out 150ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
  			'dialog-in': 'dialog-in 160ms cubic-bezier(0.23, 1, 0.32, 1)',
  			'dialog-out': 'dialog-out 100ms cubic-bezier(0.4, 0, 1, 1) forwards',
  			'overlay-in': 'overlay-in 140ms cubic-bezier(0.23, 1, 0.32, 1)',
  			'overlay-out': 'overlay-out 100ms cubic-bezier(0.4, 0, 1, 1) forwards'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')]
}
