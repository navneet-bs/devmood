import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info)
    }
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({ error: this.state.error, reset: this.reset })
    }

    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center">
        <p className="text-sm text-red-300">
          {this.props.title ?? 'something went wrong loading this section.'}
        </p>
        {this.state.error?.message && (
          <p className="mt-1 text-xs text-neutral-500">
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={this.reset}
          className="mt-4 rounded-md border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 transition hover:bg-teal-500/20"
        >
          try again
        </button>
      </div>
    )
  }
}
