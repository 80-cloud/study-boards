import { Component } from 'react';

// 子ツリーで未捕捉の例外が出たときに白画面ではなく可読のフォールバックを描く。
// main.jsx で <App /> をラップする。将来 Sentry 等の通知フックを onCatch に挟める。
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // 将来：Sentry.captureException(error, { extra: info }) などへ差し替え。
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 text-5xl" aria-hidden="true">
            ⚠️
          </div>
          <h1 className="mb-3 text-xl font-extrabold tracking-tight text-navy-700">
            予期しないエラーが発生しました
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            一時的な問題の可能性があります。ページを再読み込みしてやり直してください。
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white shadow-mac-sm transition hover:bg-navy-700/90"
          >
            再読み込み
          </button>
        </div>
      </main>
    );
  }
}
