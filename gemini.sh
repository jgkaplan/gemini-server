#!/bin/bash 
# Copyright (C) 2001-2020  Alex Schroeder <alex@gnu.org>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.
#
# Gemini and Titan
#
# This code declares two bash functions with which to read and write
# Gemini sites.
#
# Here's how to read "gemini://alexschroeder/Test":
#
#     gemini gemini://alexschroeder.ch:1965/Test
#
# The scheme and port are optional:
#
#     gemini alexschroeder.ch/Test
#
# Here's how to edit "titan://alexschroeder.ch/raw/Test" (the exact
# URLs to use depend on the site):
#
#     echo hello | titan titan://alexschroeder.ch:1965/raw/Test hello
#
# Again, the scheme and port are optional:
#
#     date | titan alexschroeder.ch/raw/Test hello
#
# You can also post a text file:
#
#     titan alexschroeder.ch/raw/Test hello test.txt
#
# So there's your workflow:
#
#     gemini alexschroeder.ch/Test > test.txt
#     vim test.txt
#     titan alexschroeder.ch/raw/Test hello test.txt
#
# To install, source this file from your ~/.bashrc file:
#
#     source ~/src/gemini-titan/gemini.sh

function gemini () {
    if [[ $1 =~ ^((gemini)://)?([^/:]+)(:([0-9]+))?/(.*)$ ]]; then
	schema=${BASH_REMATCH[2]:-gemini}
	host=${BASH_REMATCH[3]}
	port=${BASH_REMATCH[5]:-1965}
	path=${BASH_REMATCH[6]}
	echo Contacting $host:$port...
	echo -e "$schema://$host:$port/$path\r\n" \
	    | openssl s_client -quiet -connect "$host:$port" 2>/dev/null
    else
	echo $1 is not a Gemini URL
    fi
}

function titan () {
    if [[ -z "$2" ]]; then
        echo Usage: titan URL TOKEN [FILE]
	return
    else
	token=$2
    fi
    if [[ "$1" =~ ^((titan)://)?([^/:]+)(:([0-9]+))?/(.*)$ ]]; then
	schema=${BASH_REMATCH[2]:-titan}
	host=${BASH_REMATCH[3]}
	port=${BASH_REMATCH[5]:-1965}
	path=${BASH_REMATCH[6]}
	remove=0
	if [[ -z "$3" ]]; then
	    echo Type you text and end your input with Ctrl+D
	    file=$(mktemp)
	    remove=1
	    cat - > "$file"
	else
	    file="$3"
	fi
	mime=$(file --brief --mime-type "$file")
	size=$(wc -c < "$file")
	echo Posting $size bytes of $mime to $host:$port...
	(echo -e "$schema://$host:$port/$path;token=$token;mime=$mime;size=$size\r"; cat "$file") \
	    | openssl s_client -quiet -connect $host:$port 2>/dev/null
	if [[ $remove == "1" ]]; then
	    rm "$file"
	fi
    else
	echo $1 is not a Titan URL
    fi
}
