#!/bin/bash

# x402 playground backend PM2 Deployment Script

# Create logs directory
mkdir -p logs

case "$1" in
  "install")
    echo "Installing PM2 globally..."
    pnpm install -g pm2
    echo "PM2 installed!"
    ;;
  "build")
    echo "Building x402 playground backend..."
    pnpm install
    pnpm run build
    echo "Build complete!"
    ;;
  "start")
    echo "Starting x402 playground backend with PM2..."
    pm2 start ecosystem.config.cjs --env production 
    pm2 save
    echo "Service started!"
    ;;
  "startup")
    echo "Configuring PM2 to start on boot..."
    pm2 startup
    pm2 save
    echo "PM2 will now start automatically on boot!"
    ;;
  "stop")
    echo "Stopping x402 playground backend..."
    pm2 stop x402-playground-backend
    echo "Service stopped!"
    ;;
  "restart")
    echo "Restarting x402 playground backend..."
    pm2 restart x402-playground-backend
    echo "Service restarted!"
    ;;
  "reload")
    echo "Reloading x402 playground backend (zero-downtime)..."
    pm2 reload x402-playground-backend
    echo "Service reloaded!"
    ;;
  "logs")
    pm2 logs x402-playground-backend
    ;;
  "monitor")
    pm2 monit
    ;;
  "status")
    pm2 status
    ;;
  "update")
    echo "Updating service..."
    git pull
    npm install
    npm run build
    pm2 reload x402-playground-backend
    echo "Update complete!"
    ;;
  "delete")
    echo "Deleting PM2 process..."
    pm2 delete x402-playground-backend
    echo "Process deleted!"
    ;;
  *)
    echo "Usage: $0 {install|build|start|startup|stop|restart|reload|logs|monitor|status|update|delete}"
    echo ""
    echo "Commands:"
    echo "  install  - Install PM2 globally"
    echo "  build    - Build the service"
    echo "  start    - Start the service"
    echo "  startup  - Configure PM2 to start on boot"
    echo "  stop     - Stop the service"
    echo "  restart  - Restart the service"
    echo "  reload   - Zero-downtime reload"
    echo "  logs     - View logs"
    echo "  monitor  - Open PM2 monitoring dashboard"
    echo "  status   - Show service status"
    echo "  update   - Pull latest code and reload"
    echo "  delete   - Remove PM2 process"
    exit 1
    ;;
esac
