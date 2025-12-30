<div class="loading-container">
    <div class="loader"></div>
    <div class="loading-text">Loading...</div>
</div>

<style>
    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        width: 100%;
        height: 100%;
        animation: fadeIn 400ms ease-in;
    }

    @keyframes fadeIn {
        0%,
        50% {
            opacity: 0;
        }
        100% {
            opacity: 1;
        }
    }

    .loader {
        width: 50px;
        aspect-ratio: 1;
        border-radius: 50%;
        background: #a13200;
        mask: radial-gradient(circle closest-side at 50% 40%, #0000 94%, #000);
        transform-origin: 50% 40%;
        animation: l25 1s infinite cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes l25 {
        100% {
            transform: rotate(2turn);
        }
    }

    .loading-text {
        color: var(--color-text-secondary);
        animation: pulse 3s ease-in-out infinite;
    }

    @keyframes rotationBack {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(-360deg);
        }
    }

    @keyframes pulse {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.1);
        }
    }
</style>
