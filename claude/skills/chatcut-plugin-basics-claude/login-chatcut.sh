#!/bin/sh

python3 -c 'import pty,sys; pty.spawn(sys.argv[1:])' claude mcp login plugin:chatcut:chatcut > /tmp/chatcut-login.log 2>&1 &
